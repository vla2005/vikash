package com.vikash_api.services;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.IntStream;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import com.vikash_api.dtos.requests.DebtPaymentRequest;
import com.vikash_api.dtos.requests.DebtRequest;
import com.vikash_api.dtos.responses.AllDebtsResponse;
import com.vikash_api.dtos.responses.DebtResponse;
import com.vikash_api.entities.DebtEntity;
import com.vikash_api.entities.TransactionEntity;
import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.enums.TransactionType;
import com.vikash_api.exceptions.DebtException;
import com.vikash_api.exceptions.InvalidTransactionException;
import com.vikash_api.repositories.AccountRepository;
import com.vikash_api.repositories.DefaultCategoryRepository;
import com.vikash_api.repositories.DebtRepository;
import com.vikash_api.repositories.TransactionRepository;
import com.vikash_api.repositories.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DebtService {

    private static final String PAYMENT_CATEGORY = "Pagamento de dívida";

    private final DebtRepository debts;
    private final UserRepository users;
    private final AuthenticatedUserService authenticatedUser;
    private final AccountRepository accounts;
    private final DefaultCategoryRepository defaultCategories;
    private final TransactionRepository transactions;
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public AllDebtsResponse get() {
        Long userId = authenticatedUser.getCurrentUserId();
        var paidDebtIds = transactions.findPaidDebtIds(userId);
        return new AllDebtsResponse(debts.findByUserIdOrderByIdDesc(userId)
                .stream().map(debt -> toResponse(debt, paidDebtIds.contains(debt.getId()))).toList());
    }

    @Transactional
    public DebtResponse create(DebtRequest request) {
        validate(request, false);
        // Serializa a criação por perfil para que uma nova tentativa com o mesmo UUID não duplique a dívida.
        var user = users.findByUuidForUpdate(authenticatedUser.getCurrentUser().getUuid())
                .filter(owner -> owner.isEnabled()).orElseThrow(() -> new AccessDeniedException("Conta indisponível."));
        var existing = debts.findByUuidAndUserId(request.uuid(), user.getId());
        if (existing.isPresent()) {
            DebtEntity debt = existing.get();
            if (!sameDetails(debt, request) || debt.getInitiallyPaidInstallments() != request.paidInstallments()
                    || !debt.getInitialNextDueDate().equals(request.nextDueDate())) {
                throw new DebtException(HttpStatus.CONFLICT, null, "Esta dívida já foi cadastrada com outros dados.");
            }
            return toResponse(debt, transactions.existsByDebtId(debt.getId()));
        }
        var debt = new DebtEntity();
        debt.setUuid(request.uuid());
        debt.setUser(user);
        debt.setInitiallyPaidInstallments(request.paidInstallments());
        debt.setInitialNextDueDate(request.nextDueDate());
        applyDetails(debt, request);
        return toResponse(debts.save(debt), false);
    }

    @Transactional
    public DebtResponse update(UUID uuid, DebtRequest request) {
        if (!uuid.equals(request.uuid()) || request.version() == null) {
            throw new DebtException(HttpStatus.BAD_REQUEST, null, "Abra a dívida novamente para editar.");
        }
        validate(request, true);
        var debt = ownedForUpdate(uuid, authenticatedUser.getCurrentUserId());
        boolean hasRecordedPayments = transactions.existsByDebtId(debt.getId());
        LocalDate currentDue = debt.getPaidInstallments() == debt.getInstallmentCount()
                ? null : installmentDate(debt, debt.getPaidInstallments());
        boolean sameSchedule = debt.getPaidInstallments() == request.paidInstallments()
                && Objects.equals(currentDue, request.nextDueDate());
        if (sameSchedule && sameDetails(debt, request)) {
            return toResponse(debt, hasRecordedPayments);
        }
        checkVersion(debt, request.version());
        if (hasRecordedPayments && (!sameSchedule
                || debt.getTotalAmount().compareTo(request.totalAmount()) != 0
                || debt.getInstallmentCount() != request.installmentCount())) {
            throw new DebtException(HttpStatus.BAD_REQUEST, null,
                    "Estorne os pagamentos registrados no extrato para alterar o parcelamento.");
        }
        if (!sameSchedule && request.nextDueDate() != null) {
            debt.setInitialNextDueDate(request.nextDueDate());
            debt.setInitiallyPaidInstallments(request.paidInstallments());
        }
        applyDetails(debt, request);
        return toResponse(debts.saveAndFlush(debt), hasRecordedPayments);
    }

    @Transactional
    public DebtResponse payInstallment(UUID uuid, int installmentNumber, DebtPaymentRequest request) {
        var user = authenticatedUser.getCurrentUser();
        var debt = ownedForUpdate(uuid, user.getId());
        var recorded = transactions.findByDebtIdAndDebtInstallmentNumber(debt.getId(), installmentNumber);
        if (recorded.isPresent()) {
            if (!recorded.get().getAccount().getUuid().equals(request.accountUuid())) {
                throw new DebtException(HttpStatus.CONFLICT, null, "Esta parcela já foi paga por outra conta.");
            }
            return toResponse(debt, true);
        }
        checkVersion(debt, request.version());
        if (installmentNumber > debt.getInstallmentCount() || installmentNumber != debt.getPaidInstallments() + 1) {
            throw new DebtException(HttpStatus.BAD_REQUEST, null, "Marque a próxima parcela em aberto primeiro.");
        }

        var category = defaultCategories.findByName(PAYMENT_CATEGORY)
                .orElseThrow(() -> new DebtException(HttpStatus.UNPROCESSABLE_ENTITY, null,
                        "Cadastre a categoria padrão “" + PAYMENT_CATEGORY + "” para pagar a parcela."));
        var account = accounts.findOwnedForUpdate(request.accountUuid(), user.getId())
                .orElseThrow(() -> new DebtException(HttpStatus.BAD_REQUEST, "accountUuid", "Conta não encontrada."));
        entityManager.refresh(account, LockModeType.PESSIMISTIC_WRITE);
        if (!Boolean.TRUE.equals(account.getActive())) {
            throw new DebtException(HttpStatus.BAD_REQUEST, "accountUuid", "Escolha uma conta ativa.");
        }

        var amount = installmentAmount(debt, installmentNumber - 1);
        var payment = new TransactionEntity();
        payment.setUser(user);
        payment.setAccount(account);
        payment.setDebt(debt);
        payment.setDebtInstallmentNumber(installmentNumber);
        payment.setDefaultCategory(category);
        payment.setType(TransactionType.EXPENSE);
        payment.setPaymentMethod(PaymentMethod.OTHER);
        payment.setDescription(PAYMENT_CATEGORY + " · " + debt.getCreditor()
                + " · parcela " + installmentNumber + "/" + debt.getInstallmentCount());
        payment.setAmount(amount);
        payment.setOccurredAt(LocalDateTime.now(ZoneId.of("America/Sao_Paulo")));
        payment.setTranscription("");
        transactions.save(payment);
        account.setBalance(account.getBalance().subtract(amount));
        debt.setPaidInstallments(installmentNumber);
        return toResponse(debts.saveAndFlush(debt), true);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void reverseInstallment(TransactionEntity payment, Long userId) {
        var debt = ownedForUpdate(payment.getDebt().getUuid(), userId);
        if (payment.getDebtInstallmentNumber() != debt.getPaidInstallments()) {
            throw new InvalidTransactionException("Estorne os pagamentos das parcelas posteriores primeiro.");
        }
        debt.setPaidInstallments(debt.getPaidInstallments() - 1);
    }

    private DebtEntity ownedForUpdate(UUID uuid, Long userId) {
        var debt = debts.findOwnedForUpdate(uuid, userId)
                .orElseThrow(() -> new DebtException(HttpStatus.NOT_FOUND, null, "Dívida não encontrada."));
        entityManager.refresh(debt, LockModeType.PESSIMISTIC_WRITE);
        return debt;
    }

    private void checkVersion(DebtEntity debt, long version) {
        if (debt.getVersion() != version) {
            throw new DebtException(HttpStatus.CONFLICT, null, "Esta dívida mudou. Consulte os dados atuais e tente novamente.");
        }
    }

    private void validate(DebtRequest request, boolean editing) {
        int count = request.installmentCount();
        int paid = request.paidInstallments();
        if (paid > count || (!editing && paid == count)) {
            throw new DebtException(HttpStatus.BAD_REQUEST, "paidInstallments", editing
                    ? "O número deve ser de até o total de parcelas."
                    : "O número deve ser menor que o total de parcelas.");
        }
        if (request.totalAmount().movePointRight(2).longValueExact() < count) {
            throw new DebtException(HttpStatus.BAD_REQUEST, "totalAmount", "Cada parcela deve ter pelo menos R$ 0,01.");
        }
        LocalDate due = request.nextDueDate();
        if (paid == count) {
            if (due != null) {
                throw new DebtException(HttpStatus.BAD_REQUEST, "nextDueDate", "A dívida quitada não tem próxima parcela.");
            }
        } else if (due == null) {
            throw new DebtException(HttpStatus.BAD_REQUEST, "nextDueDate", "Informe o vencimento da próxima parcela.");
        } else if (due.getYear() < 1900 || due.getYear() > 9999 || due.plusMonths(count - paid - 1L).getYear() > 9999) {
            throw new DebtException(HttpStatus.BAD_REQUEST, "nextDueDate", "Informe um vencimento válido para as parcelas.");
        }
    }

    private String description(DebtRequest request) {
        return request.description() == null || request.description().isBlank() ? null : request.description().strip();
    }

    private boolean sameDetails(DebtEntity debt, DebtRequest request) {
        return debt.getCreditor().equals(request.creditor().strip())
                && Objects.equals(debt.getDescription(), description(request))
                && debt.getTotalAmount().compareTo(request.totalAmount()) == 0
                && debt.getInstallmentCount() == request.installmentCount();
    }

    private void applyDetails(DebtEntity debt, DebtRequest request) {
        debt.setCreditor(request.creditor().strip());
        debt.setDescription(description(request));
        debt.setTotalAmount(request.totalAmount().setScale(2));
        debt.setInstallmentCount(request.installmentCount());
        debt.setPaidInstallments(request.paidInstallments());
    }

    private LocalDate installmentDate(DebtEntity debt, int index) {
        return debt.getInitialNextDueDate().plusMonths(index - debt.getInitiallyPaidInstallments());
    }

    private BigDecimal installmentAmount(DebtEntity debt, int index) {
        long cents = debt.getTotalAmount().movePointRight(2).longValueExact();
        int count = debt.getInstallmentCount();
        return BigDecimal.valueOf(cents / count + (index < cents % count ? 1 : 0), 2);
    }

    private DebtResponse toResponse(DebtEntity debt, boolean hasRecordedPayments) {
        int count = debt.getInstallmentCount();
        var installments = IntStream.range(debt.getPaidInstallments(), count)
                .mapToObj(index -> new DebtResponse.Installment(index + 1,
                        installmentDate(debt, index),
                        installmentAmount(debt, index)))
                .toList();
        return new DebtResponse(debt.getUuid(), debt.getCreditor(), debt.getDescription(), debt.getTotalAmount(),
                count, debt.getPaidInstallments(), installments, debt.getVersion(), hasRecordedPayments);
    }
}
