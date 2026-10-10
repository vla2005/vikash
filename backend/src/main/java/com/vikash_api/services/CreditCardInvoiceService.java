package com.vikash_api.services;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vikash_api.dtos.requests.CreditCardInitialInvoiceRequest;
import com.vikash_api.dtos.requests.CreditCardInitialInvoicesRequest;
import com.vikash_api.dtos.requests.CreditCardInvoicePaymentRequest;
import com.vikash_api.dtos.requests.CreditCardInvoiceRequest;
import com.vikash_api.dtos.responses.AllCreditCardInvoicesResponse;
import com.vikash_api.dtos.responses.CreditCardInvoiceResponse;
import com.vikash_api.entities.CreditCardEntity;
import com.vikash_api.entities.CreditCardInvoiceEntity;
import com.vikash_api.entities.TransactionEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.enums.CreditCardInvoiceStatus;
import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.enums.TransactionType;
import com.vikash_api.exceptions.CreditCardInvoiceAlreadyExistsException;
import com.vikash_api.exceptions.CreditCardInvoiceNotFoundException;
import com.vikash_api.exceptions.InvalidCreditCardInvoiceException;
import com.vikash_api.exceptions.InvalidCreditCardSetupException;
import com.vikash_api.repositories.AccountRepository;
import com.vikash_api.repositories.CreditCardInstallmentRepository;
import com.vikash_api.repositories.CreditCardInvoiceRepository;
import com.vikash_api.repositories.CreditCardRepository;
import com.vikash_api.repositories.TransactionRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CreditCardInvoiceService {
    private final EntityManager entityManager;
    private final AuthenticatedUserService authenticatedUserService;
    private final CreditCardInvoiceRepository creditCardInvoiceRepository;
    private final CreditCardRepository creditCardRepository;
    private final CreditCardInstallmentRepository creditCardInstallmentRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;

    @Transactional
    public void distributeInitialAmounts(UUID cardUuid, CreditCardInitialInvoicesRequest request) {
        var user = authenticatedUserService.getCurrentUser();
        var card = lockCard(cardUuid, user.getId());
        entityManager.refresh(card, LockModeType.PESSIMISTIC_WRITE);
        if (!Boolean.TRUE.equals(card.getActive())) {
            throw new InvalidCreditCardSetupException("invoices", "Não é possível distribuir valores de um cartão arquivado.");
        }

        var months = new HashSet<String>();
        List<CreditCardInvoiceEntity> invoices = new ArrayList<>();
        BigDecimal difference = BigDecimal.ZERO;
        for (var item : request.invoices()) {
            if (!months.add(item.referenceMonth())) {
                throw new InvalidCreditCardSetupException("invoices", "Informe cada mês de referência apenas uma vez.");
            }
            validateInitialInvoice(item);
            var invoice = creditCardInvoiceRepository.findByCreditCardIdAndReferenceMonth(card.getId(), item.referenceMonth())
                    .orElse(null);
            if (invoice != null) {
                entityManager.refresh(invoice, LockModeType.PESSIMISTIC_WRITE);
                if (invoice.getStatus() == CreditCardInvoiceStatus.PAID) {
                    throw new InvalidCreditCardSetupException("invoices", "Não é possível alterar o valor inicial de uma fatura paga.");
                }
                if (!invoice.getClosingDate().equals(item.closingDate()) || !invoice.getDueDate().equals(item.dueDate())) {
                    throw new InvalidCreditCardSetupException("invoices", "As datas devem corresponder às da fatura existente.");
                }
            } else {
                invoice = new CreditCardInvoiceEntity();
                invoice.setCreditCard(card);
                invoice.setReferenceMonth(item.referenceMonth());
                invoice.setClosingDate(item.closingDate());
                invoice.setDueDate(item.dueDate());
                invoice.setStatus(item.closingDate().isAfter(LocalDate.now(ZoneId.of("America/Sao_Paulo")))
                        ? CreditCardInvoiceStatus.OPEN : CreditCardInvoiceStatus.CLOSED);
            }
            difference = difference.add(item.initialAmount().subtract(invoice.getInitialAmount()));
            invoices.add(invoice);
        }

        // Confere o lote inteiro antes de mudar valores, permitindo mover saldo entre meses.
        BigDecimal remaining = card.getUnallocatedUsedLimit().subtract(difference);
        if (remaining.signum() < 0) {
            throw new InvalidCreditCardSetupException("invoices", "O valor distribuído excede o limite comprometido ainda não distribuído.");
        }
        for (int index = 0; index < invoices.size(); index++) {
            var invoice = invoices.get(index);
            invoice.setInitialAmount(request.invoices().get(index).initialAmount());
            if (invoice.getId() != null || invoice.getInitialAmount().signum() > 0) { save(invoice); }
        }
        card.setUnallocatedUsedLimit(remaining);
        creditCardRepository.save(card);
    }

    private void validateInitialInvoice(CreditCardInitialInvoiceRequest request) {
        if (request.initialAmount().signum() < 0) {
            throw new InvalidCreditCardSetupException("invoices", "O valor inicial não pode ser negativo.");
        }
        if (!request.dueDate().isAfter(request.closingDate())) {
            throw new InvalidCreditCardSetupException("invoices", "O vencimento deve ser posterior ao fechamento.");
        }
        if (!YearMonth.from(request.dueDate()).toString().equals(request.referenceMonth())) {
            throw new InvalidCreditCardSetupException("invoices", "O mês de referência deve corresponder ao mês do vencimento.");
        }
    }

    @Transactional
    public void pay(UUID uuid, CreditCardInvoicePaymentRequest request) {
        registerPayment(uuid, null, request, null, "Pagamento de fatura confirmado no aplicativo.");
    }

    @Transactional
    public void reversePayment(TransactionEntity payment, Long userId) {
        var invoice = payment.getCreditCardInvoice();
        if (invoice == null || !invoice.getCreditCard().getUser().getId().equals(userId)) {
            throw new InvalidCreditCardInvoiceException("Fatura do pagamento não encontrada.");
        }
        lockCard(invoice.getCreditCard().getUuid(), userId);
        entityManager.refresh(invoice, LockModeType.PESSIMISTIC_WRITE);
        if (invoice.getStatus() != CreditCardInvoiceStatus.PAID) {
            throw new InvalidCreditCardInvoiceException("Esta fatura não está marcada como paga.");
        }
        var account = accountRepository.findOwnedForUpdate(payment.getAccount().getUuid(), userId)
                .orElseThrow(() -> new InvalidCreditCardInvoiceException("Conta não encontrada."));
        entityManager.refresh(account, LockModeType.PESSIMISTIC_WRITE);
        account.setBalance(account.getBalance().add(payment.getAmount()));
        invoice.setStatus(CreditCardInvoiceStatus.CLOSED);
        creditCardInvoiceRepository.save(invoice);
    }

    @Transactional
    public void payFromVoice(UUID uuid, UUID creditCardUuid, CreditCardInvoicePaymentRequest request,
            BigDecimal expectedAmount, String transcription) {
        registerPayment(uuid, creditCardUuid, request, expectedAmount, transcription);
    }

    private TransactionEntity registerPayment(UUID uuid, UUID expectedCardUuid, CreditCardInvoicePaymentRequest request,
            BigDecimal expectedAmount, String transcription) {
        UserEntity user = authenticatedUserService.getCurrentUser();
        CreditCardInvoiceEntity invoice = getInvoice(uuid, user.getId());
        if (expectedCardUuid != null && !invoice.getCreditCard().getUuid().equals(expectedCardUuid)) {
            throw new InvalidCreditCardInvoiceException("A fatura não pertence ao cartão informado.");
        }
        // Compras e pagamentos travam primeiro o cartão. O refresh lê o status atual sob bloqueio.
        lockCard(invoice.getCreditCard().getUuid(), user.getId());
        entityManager.refresh(invoice, LockModeType.PESSIMISTIC_WRITE);
        if (invoice.getStatus() == CreditCardInvoiceStatus.PAID) {
            throw new InvalidCreditCardInvoiceException("Esta fatura já foi paga.");
        }
        if (request.paymentMethod() == null || request.paymentMethod() == PaymentMethod.CREDIT_CARD) {
            throw new InvalidCreditCardInvoiceException("Escolha uma forma de pagamento que utilize o saldo da conta.");
        }
        if (request.occurredAt() == null || request.occurredAt().isAfter(LocalDateTime.now())) {
            throw new InvalidCreditCardInvoiceException("Informe uma data de pagamento válida, sem usar uma data futura.");
        }
        if (request.occurredAt().toLocalDate().isBefore(invoice.getClosingDate())) {
            throw new InvalidCreditCardInvoiceException("O pagamento integral só pode ser registrado após o fechamento da fatura.");
        }
        var account = accountRepository.findOwnedForUpdate(request.accountUuid(), user.getId())
                .orElseThrow(() -> new InvalidCreditCardInvoiceException("Conta não encontrada."));
        entityManager.refresh(account, LockModeType.PESSIMISTIC_WRITE);
        if (!Boolean.TRUE.equals(account.getActive())) {
            throw new InvalidCreditCardInvoiceException("Escolha uma conta ativa para pagar a fatura.");
        }
        var total = invoice.getInitialAmount().add(creditCardInstallmentRepository.sumByInvoiceId(invoice.getId()));
        if (total.signum() <= 0) { throw new InvalidCreditCardInvoiceException("Esta fatura não tem valor a pagar."); }
        if (expectedAmount != null && expectedAmount.compareTo(total) != 0) {
            throw new InvalidCreditCardInvoiceException("O valor informado deve corresponder ao total da fatura. Pagamentos parciais ainda não são suportados.");
        }
        if (account.getBalance().compareTo(total) < 0) {
            throw new InvalidCreditCardInvoiceException("Saldo insuficiente para pagar esta fatura.");
        }
        var payment = new TransactionEntity();
        payment.setUser(user);
        payment.setAccount(account);
        payment.setCreditCardInvoice(invoice);
        payment.setType(TransactionType.INVOICE_PAYMENT);
        payment.setPaymentMethod(request.paymentMethod());
        Integer lastFourDigits = invoice.getCreditCard().getLastFourDigits();
        String cardLabel = lastFourDigits == null ? "Cartão sem final informado"
                : String.format("Cartão final %04d", lastFourDigits);
        payment.setDescription("Pagamento da fatura " + invoice.getReferenceMonth() + " · " + cardLabel);
        payment.setAmount(total);
        payment.setOccurredAt(request.occurredAt());
        payment.setTranscription(transcription);
        transactionRepository.save(payment);
        account.setBalance(account.getBalance().subtract(total));
        invoice.setStatus(CreditCardInvoiceStatus.PAID);
        creditCardInvoiceRepository.save(invoice);
        return payment;
    }

    @Transactional
    public CreditCardInvoiceResponse create(CreditCardInvoiceRequest request) {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        CreditCardEntity card = lockCard(request.creditCardUuid(), currentUser.getId());
        validateRequest(request, card, null);
        CreditCardInvoiceEntity invoice = new CreditCardInvoiceEntity();
        applyRequest(invoice, card, request);
        invoice.setStatus(CreditCardInvoiceStatus.OPEN);
        return toResponse(save(invoice));
    }

    @Transactional(readOnly = true)
    public AllCreditCardInvoicesResponse get(UUID creditCardUuid) {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        if (creditCardUuid != null) { getCard(creditCardUuid, currentUser.getId()); }
        var invoices = creditCardUuid == null
                ? creditCardInvoiceRepository.findByCreditCardUserIdOrderByDueDateDescIdDesc(currentUser.getId())
                : creditCardInvoiceRepository.findByCreditCardUuidAndCreditCardUserIdOrderByDueDateDescIdDesc(creditCardUuid, currentUser.getId());
        var amounts = creditCardUuid == null
                ? creditCardInvoiceRepository.findAmountsByUserId(currentUser.getId())
                : creditCardInvoiceRepository.findAmountsByCardUuidAndUserId(creditCardUuid, currentUser.getId());
        var totals = amounts.stream().collect(Collectors.toMap(amount -> amount.uuid(), amount -> amount.total()));
        return new AllCreditCardInvoicesResponse(invoices.stream()
                .map(invoice -> toResponse(invoice, totals.getOrDefault(invoice.getUuid(), invoice.getInitialAmount()))).toList());
    }

    @Transactional(readOnly = true)
    public CreditCardInvoiceResponse getByUuid(UUID uuid) {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        return toResponse(getInvoice(uuid, currentUser.getId()));
    }

    @Transactional
    public CreditCardInvoiceResponse update(UUID uuid, CreditCardInvoiceRequest request) {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        CreditCardInvoiceEntity invoice = getInvoice(uuid, currentUser.getId());
        CreditCardEntity card = lockCard(request.creditCardUuid(), currentUser.getId());
        entityManager.refresh(invoice, LockModeType.PESSIMISTIC_WRITE);
        if (invoice.getStatus() != CreditCardInvoiceStatus.OPEN) {
            throw new InvalidCreditCardInvoiceException("Somente faturas abertas podem ser editadas.");
        }
        if (!invoice.getCreditCard().getUuid().equals(card.getUuid())) {
            throw new InvalidCreditCardInvoiceException("Não é possível transferir uma fatura para outro cartão.");
        }
        validateRequest(request, card, uuid);
        applyRequest(invoice, card, request);
        return toResponse(save(invoice));
    }

    @Transactional
    public CreditCardInvoiceEntity getOrCreateForPurchase(UUID creditCardUuid, LocalDate purchaseDate) {
        return getOrCreateForInstallment(creditCardUuid, purchaseDate, 1);
    }

    @Transactional
    public CreditCardInvoiceEntity getOrCreateForInstallment(UUID creditCardUuid, LocalDate purchaseDate, int installmentNumber) {
        if (installmentNumber < 1 || installmentNumber > 120) {
            throw new InvalidCreditCardInvoiceException("O número da parcela deve estar entre 1 e 120.");
        }
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        CreditCardEntity card = lockCard(creditCardUuid, currentUser.getId());
        if (!Boolean.TRUE.equals(card.getActive())) {
            throw new InvalidCreditCardInvoiceException("Não é possível lançar compras em um cartão arquivado.");
        }
        YearMonth closingMonth = YearMonth.from(purchaseDate);
        LocalDate closingDate = dayInMonth(closingMonth, card.getClosingDay());
        // Compras no próprio dia do fechamento entram no ciclo seguinte.
        if (!purchaseDate.isBefore(closingDate)) {
            closingMonth = closingMonth.plusMonths(1);
            closingDate = dayInMonth(closingMonth, card.getClosingDay());
        }
        // Avança os ciclos, preservando o dia configurado até em meses mais curtos.
        closingMonth = closingMonth.plusMonths(installmentNumber - 1);
        closingDate = dayInMonth(closingMonth, card.getClosingDay());
        LocalDate dueDate = dayInMonth(closingMonth, card.getDueDay());
        if (!dueDate.isAfter(closingDate)) {
            dueDate = dayInMonth(closingMonth.plusMonths(1), card.getDueDay());
        }
        String referenceMonth = YearMonth.from(dueDate).toString();
        var existing = creditCardInvoiceRepository.findByCreditCardIdAndReferenceMonth(card.getId(), referenceMonth);
        if (existing.isPresent()) {
            CreditCardInvoiceEntity invoice = existing.get();
            if (invoice.getStatus() != CreditCardInvoiceStatus.OPEN || !purchaseDate.isBefore(invoice.getClosingDate())) {
                throw new InvalidCreditCardInvoiceException("A fatura desse período não está aberta para novos lançamentos.");
            }
            return invoice;
        }
        CreditCardInvoiceEntity invoice = new CreditCardInvoiceEntity();
        invoice.setCreditCard(card);
        invoice.setReferenceMonth(referenceMonth);
        invoice.setClosingDate(closingDate);
        invoice.setDueDate(dueDate);
        return save(invoice);
    }

    private LocalDate dayInMonth(YearMonth month, Integer day) {
        return month.atDay(Math.min(day, month.lengthOfMonth()));
    }

    private CreditCardEntity lockCard(UUID uuid, Long userId) {
        return creditCardRepository.findOwnedForUpdate(uuid, userId)
                .orElseThrow(() -> new CreditCardInvoiceNotFoundException("Cartão não encontrado."));
    }

    private CreditCardEntity getCard(UUID uuid, Long userId) {
        return creditCardRepository.findByUuidAndUserId(uuid, userId)
                .orElseThrow(() -> new CreditCardInvoiceNotFoundException("Cartão não encontrado."));
    }

    private CreditCardInvoiceEntity getInvoice(UUID uuid, Long userId) {
        return creditCardInvoiceRepository.findByUuidAndCreditCardUserId(uuid, userId)
                .orElseThrow(() -> new CreditCardInvoiceNotFoundException("Fatura não encontrada."));
    }

    private void validateRequest(CreditCardInvoiceRequest request, CreditCardEntity card, UUID excludedUuid) {
        if (!Boolean.TRUE.equals(card.getActive())) {
            throw new InvalidCreditCardInvoiceException("Não é possível criar ou editar faturas de um cartão arquivado.");
        }
        if (!request.dueDate().isAfter(request.closingDate())) {
            throw new InvalidCreditCardInvoiceException("O vencimento deve ser posterior ao fechamento.");
        }
        if (!YearMonth.from(request.dueDate()).toString().equals(request.referenceMonth())) {
            throw new InvalidCreditCardInvoiceException("O mês de referência deve corresponder ao mês do vencimento.");
        }
        boolean duplicate = excludedUuid == null
                ? creditCardInvoiceRepository.existsByCreditCardIdAndReferenceMonth(card.getId(), request.referenceMonth())
                : creditCardInvoiceRepository.existsByCreditCardIdAndReferenceMonthAndUuidNot(card.getId(), request.referenceMonth(), excludedUuid);
        if (duplicate) { throw duplicateInvoice(); }
    }

    private void applyRequest(CreditCardInvoiceEntity invoice, CreditCardEntity card, CreditCardInvoiceRequest request) {
        invoice.setCreditCard(card);
        invoice.setReferenceMonth(request.referenceMonth());
        invoice.setClosingDate(request.closingDate());
        invoice.setDueDate(request.dueDate());
    }

    private CreditCardInvoiceEntity save(CreditCardInvoiceEntity invoice) {
        try {
            return creditCardInvoiceRepository.saveAndFlush(invoice);
        } catch (DataIntegrityViolationException exception) {
            // A restrição do banco também protege contra criações simultâneas.
            for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
                if (cause instanceof ConstraintViolationException violation
                        && violation.getConstraintName() != null
                        && violation.getConstraintName().toLowerCase(java.util.Locale.ROOT)
                                .contains("uk_credit_card_invoice_reference_month")) {
                    throw duplicateInvoice();
                }
            }
            throw exception;
        }
    }

    private CreditCardInvoiceAlreadyExistsException duplicateInvoice() {
        return new CreditCardInvoiceAlreadyExistsException("Já existe uma fatura desse cartão para o mês informado.");
    }

    private CreditCardInvoiceResponse toResponse(CreditCardInvoiceEntity invoice) {
        return toResponse(invoice, invoice.getInitialAmount().add(creditCardInstallmentRepository.sumByInvoiceId(invoice.getId())));
    }

    private CreditCardInvoiceResponse toResponse(CreditCardInvoiceEntity invoice, BigDecimal total) {
        CreditCardEntity card = invoice.getCreditCard();
        return new CreditCardInvoiceResponse(invoice.getUuid(), card.getUuid(), card.getLastFourDigits(),
                invoice.getReferenceMonth(), invoice.getClosingDate(), invoice.getDueDate(), invoice.getStatus(),
                invoice.getCreatedAt(), invoice.getUpdatedAt(), invoice.getInitialAmount(), total);
    }
}
