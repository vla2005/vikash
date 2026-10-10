package com.vikash_api.services;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.UUID;
import com.vikash_api.dtos.requests.TransactionUpdateRequest;
import com.vikash_api.entities.AccountEntity;
import com.vikash_api.entities.CreditCardEntity;
import com.vikash_api.entities.CreditCardInstallmentEntity;
import com.vikash_api.entities.CreditCardPurchaseEntity;
import com.vikash_api.entities.CustomCategoryEntity;
import com.vikash_api.entities.DefaultCategoriesEntity;
import com.vikash_api.entities.TransactionEntity;
import com.vikash_api.enums.CreditCardInvoiceStatus;
import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.enums.TransactionType;
import com.vikash_api.exceptions.InvalidTransactionUpdateException;
import com.vikash_api.exceptions.TransactionNotFoundException;
import com.vikash_api.repositories.AccountRepository;
import com.vikash_api.repositories.CreditCardInstallmentRepository;
import com.vikash_api.repositories.CreditCardPurchaseRepository;
import com.vikash_api.repositories.CreditCardRepository;
import com.vikash_api.repositories.CustomCategoryRepository;
import com.vikash_api.repositories.DefaultCategoryRepository;
import com.vikash_api.repositories.TransactionRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TransactionEditService {
    private final AuthenticatedUserService authenticatedUserService;
    private final TransactionRepository transactionRepository;
    private final CreditCardPurchaseRepository purchaseRepository;
    private final CreditCardInstallmentRepository installmentRepository;
    private final AccountRepository accountRepository;
    private final CreditCardRepository cardRepository;
    private final DefaultCategoryRepository defaultCategoryRepository;
    private final CustomCategoryRepository customCategoryRepository;
    private final CreditCardInvoiceService invoiceService;
    private final CreditCardPurchaseService purchaseService;
    private final EntityManager entityManager;

    @Transactional
    public void updateTransaction(UUID uuid, TransactionUpdateRequest request) {
        var user = authenticatedUserService.getCurrentUser();
        var entry = transactionRepository.findOwnedForUpdate(uuid, user.getId())
                .orElseThrow(() -> new TransactionNotFoundException("Transação não encontrada."));
        validatePayment(request, entry.getType());
        var category = getCategory(request, user.getId());
        if (entry.getType() == TransactionType.INVOICE_PAYMENT) {
            validateInvoicePayment(entry, request, user.getId());
        }
        CreditCardEntity card = request.creditCardUuid() == null ? null
                : lockCards(user.getId(), request.creditCardUuid()).get(request.creditCardUuid());
        if (card != null) { requireActiveCard(card); }
        var accounts = lockAccounts(user.getId(), entry.getAccount().getUuid(),
                entry.getDestinationAccount() == null ? null : entry.getDestinationAccount().getUuid(),
                request.accountUuid(), request.destinationAccountUuid());
        var account = accounts.get(request.accountUuid());
        var destination = accounts.get(request.destinationAccountUuid());
        validateNewAccounts(entry, account, destination);
        // Desfaz o lançamento anterior e aplica o novo dentro da mesma transação.
        applyBalance(accounts.get(entry.getAccount().getUuid()),
                entry.getDestinationAccount() == null ? null : accounts.get(entry.getDestinationAccount().getUuid()),
                entry.getType(), entry.getAmount().negate());
        if (card != null) {
            var firstInvoice = invoiceService.getOrCreateForPurchase(card.getUuid(), entry.getOccurredAt().toLocalDate());
            var purchase = new CreditCardPurchaseEntity();
            purchase.setUuid(entry.getUuid()); purchase.setCreditCard(card); purchase.setInstallmentCount(1);
            purchase.setDescription(request.description()); purchase.setAmount(request.amount().setScale(2));
            purchase.setDefaultCategory(category.defaults()); purchase.setCustomCategory(category.custom());
            purchase.setOccurredAt(entry.getOccurredAt()); purchase.setTranscription(entry.getTranscription());
            purchaseRepository.save(purchase);
            purchaseService.createInstallments(purchase, firstInvoice);
            transactionRepository.delete(entry);
        } else {
            if (entry.getType() == TransactionType.INVOICE_PAYMENT
                    && !account.getUuid().equals(entry.getAccount().getUuid())
                    && account.getBalance().compareTo(request.amount()) < 0) {
                throw invalid("accountUuid", "Saldo insuficiente na conta escolhida para pagar a fatura.");
            }
            applyBalance(account, destination, entry.getType(), request.amount());
            entry.setDescription(request.description()); entry.setAmount(request.amount().setScale(2));
            entry.setPaymentMethod(request.paymentMethod()); entry.setAccount(account); entry.setDestinationAccount(destination);
            entry.setDefaultCategory(category.defaults()); entry.setCustomCategory(category.custom());
        }
    }

    @Transactional
    public void updatePurchase(UUID uuid, TransactionUpdateRequest request) {
        var user = authenticatedUserService.getCurrentUser();
        var purchase = purchaseRepository.findOwnedForUpdate(uuid, user.getId())
                .orElseThrow(() -> new TransactionNotFoundException("Compra no crédito não encontrada."));
        validatePayment(request, TransactionType.EXPENSE);
        var category = getCategory(request, user.getId());
        UUID oldCardUuid = purchase.getCreditCard().getUuid();
        var cards = lockCards(user.getId(), oldCardUuid, request.creditCardUuid());
        boolean financialChange = request.amount().compareTo(purchase.getAmount()) != 0
                || request.paymentMethod() != PaymentMethod.CREDIT_CARD || !oldCardUuid.equals(request.creditCardUuid());
        var installments = installmentRepository.findByPurchaseId(purchase.getId());
        // Lê o status atual após bloquear os cartões, inclusive se houve pagamento concorrente.
        for (var invoice : installments.stream().map(CreditCardInstallmentEntity::getCreditCardInvoice).distinct().toList()) {
            entityManager.refresh(invoice, LockModeType.PESSIMISTIC_WRITE);
        }
        if (financialChange && installments.stream().anyMatch(item -> item.getCreditCardInvoice().getStatus() == CreditCardInvoiceStatus.PAID)) {
            throw invalid("amount", "Esta compra tem parcelas pagas. Desfaça o pagamento da fatura antes de alterar o valor, pagamento ou cartão.");
        }
        if (request.paymentMethod() == PaymentMethod.CREDIT_CARD) {
            if (request.amount().compareTo(new BigDecimal("0.01").multiply(BigDecimal.valueOf(purchase.getInstallmentCount()))) < 0) {
                throw invalid("amount", "O valor de cada parcela deve ser pelo menos R$ 0,01.");
            }
            var card = cards.get(request.creditCardUuid());
            if (!oldCardUuid.equals(card.getUuid())) { requireActiveCard(card); }
            boolean moved = !oldCardUuid.equals(card.getUuid());
            purchase.setDescription(request.description()); purchase.setAmount(request.amount().setScale(2));
            purchase.setDefaultCategory(category.defaults()); purchase.setCustomCategory(category.custom());
            if (moved) {
                var firstInvoice = invoiceService.getOrCreateForPurchase(card.getUuid(), purchase.getOccurredAt().toLocalDate());
                installmentRepository.deleteAll(installments); installmentRepository.flush();
                purchase.setCreditCard(card);
                purchaseService.createInstallments(purchase, firstInvoice);
            } else if (financialChange) {
                purchaseService.updateInstallmentAmounts(purchase, installments);
            }
        } else {
            var account = lockAccounts(user.getId(), request.accountUuid()).get(request.accountUuid());
            requireActiveAccount(account);
            var entry = new TransactionEntity();
            entry.setUuid(purchase.getUuid()); entry.setUser(user); entry.setType(TransactionType.EXPENSE);
            entry.setDescription(request.description()); entry.setAmount(request.amount().setScale(2));
            entry.setPaymentMethod(request.paymentMethod()); entry.setAccount(account);
            entry.setDefaultCategory(category.defaults()); entry.setCustomCategory(category.custom());
            entry.setOccurredAt(purchase.getOccurredAt()); entry.setTranscription(purchase.getTranscription());
            transactionRepository.save(entry);
            applyBalance(account, null, TransactionType.EXPENSE, request.amount());
            installmentRepository.deleteAll(installments); installmentRepository.flush();
            purchaseRepository.delete(purchase);
        }
    }

    private void validatePayment(TransactionUpdateRequest request, TransactionType type) {
        boolean credit = request.paymentMethod() == PaymentMethod.CREDIT_CARD;
        if (credit) {
            if (type != TransactionType.EXPENSE) { throw invalid("paymentMethod", "Crédito só pode ser usado para saídas."); }
            if (request.creditCardUuid() == null || request.accountUuid() != null) {
                throw invalid("creditCardUuid", "Escolha um cartão, sem informar uma conta para o crédito.");
            }
        } else if (request.accountUuid() == null || request.creditCardUuid() != null) {
            throw invalid("accountUuid", "Escolha a conta utilizada, sem informar um cartão.");
        }
        if (type == TransactionType.TRANSFER) {
            if (request.destinationAccountUuid() == null || request.destinationAccountUuid().equals(request.accountUuid())) {
                throw invalid("destinationAccountUuid", "Escolha uma conta de destino diferente da origem.");
            }
        } else if (request.destinationAccountUuid() != null) {
            throw invalid("destinationAccountUuid", "Somente transferências podem ter conta de destino.");
        }
    }

    private void validateInvoicePayment(TransactionEntity entry, TransactionUpdateRequest request, Long userId) {
        if (request.amount().compareTo(entry.getAmount()) != 0) {
            throw invalid("amount", "O valor é o total da fatura. Desfaça o pagamento para corrigir a fatura.");
        }
        if (request.defaultCategoryName() != null || request.customCategoryUuid() != null) {
            throw invalid("defaultCategoryName", "Pagamentos de faturas não usam categorias.");
        }
        var invoice = entry.getCreditCardInvoice();
        lockCards(userId, invoice.getCreditCard().getUuid());
        entityManager.refresh(invoice, LockModeType.PESSIMISTIC_WRITE);
        if (invoice.getStatus() != CreditCardInvoiceStatus.PAID) {
            throw invalid("amount", "A fatura não está marcada como paga. Atualize o lançamento.");
        }
    }

    private Map<UUID, AccountEntity> lockAccounts(Long userId, UUID... uuids) {
        Map<UUID, AccountEntity> result = new HashMap<>();
        for (var uuid : ordered(uuids)) {
            var account = accountRepository.findOwnedForUpdate(uuid, userId)
                    .orElseThrow(() -> invalid("accountUuid", "Conta não encontrada."));
            entityManager.refresh(account, LockModeType.PESSIMISTIC_WRITE);
            result.put(uuid, account);
        }
        return result;
    }

    private Map<UUID, CreditCardEntity> lockCards(Long userId, UUID... uuids) {
        Map<UUID, CreditCardEntity> result = new HashMap<>();
        for (var uuid : ordered(uuids)) {
            var card = cardRepository.findOwnedForUpdate(uuid, userId)
                    .orElseThrow(() -> invalid("creditCardUuid", "Cartão não encontrado."));
            entityManager.refresh(card, LockModeType.PESSIMISTIC_WRITE);
            result.put(uuid, card);
        }
        return result;
    }

    private SortedSet<UUID> ordered(UUID... uuids) {
        var sorted = new TreeSet<UUID>();
        for (var uuid : uuids) { if (uuid != null) { sorted.add(uuid); } }
        return sorted;
    }

    private void validateNewAccounts(TransactionEntity entry, AccountEntity account, AccountEntity destination) {
        if (account != null && !account.getUuid().equals(entry.getAccount().getUuid())) { requireActiveAccount(account); }
        if (destination != null && (entry.getDestinationAccount() == null
                || !destination.getUuid().equals(entry.getDestinationAccount().getUuid()))) { requireActiveAccount(destination); }
    }

    private void requireActiveAccount(AccountEntity account) {
        if (!Boolean.TRUE.equals(account.getActive())) { throw invalid("accountUuid", "Escolha uma conta ativa."); }
    }

    private void requireActiveCard(CreditCardEntity card) {
        if (!Boolean.TRUE.equals(card.getActive())) { throw invalid("creditCardUuid", "Escolha um cartão ativo."); }
    }

    private void applyBalance(AccountEntity account, AccountEntity destination, TransactionType type, BigDecimal amount) {
        account.setBalance(type == TransactionType.INCOME ? account.getBalance().add(amount) : account.getBalance().subtract(amount));
        if (type == TransactionType.TRANSFER) { destination.setBalance(destination.getBalance().add(amount)); }
    }

    private Category getCategory(TransactionUpdateRequest request, Long userId) {
        if (request.defaultCategoryName() != null && request.customCategoryUuid() != null) {
            throw invalid("defaultCategoryName", "Escolha apenas uma categoria.");
        }
        var defaults = request.defaultCategoryName() == null ? null : defaultCategoryRepository.findByName(request.defaultCategoryName())
                .orElseThrow(() -> invalid("defaultCategoryName", "Categoria padrão não encontrada."));
        var custom = request.customCategoryUuid() == null ? null : customCategoryRepository.findByUuidAndUserId(request.customCategoryUuid(), userId)
                .orElseThrow(() -> invalid("customCategoryUuid", "Categoria personalizada não encontrada."));
        return new Category(defaults, custom);
    }

    private InvalidTransactionUpdateException invalid(String field, String message) {
        return new InvalidTransactionUpdateException(field, message);
    }

    private record Category(DefaultCategoriesEntity defaults, CustomCategoryEntity custom) {}
}
