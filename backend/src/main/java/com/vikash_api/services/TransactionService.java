package com.vikash_api.services;

import com.vikash_api.repositories.CreditCardInvoiceRepository;
import com.vikash_api.dtos.requests.CreditCardInvoicePaymentRequest;

import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vikash_api.dtos.requests.TransactionRequest;
import com.vikash_api.dtos.requests.AiAnalysisContext;
import com.vikash_api.dtos.responses.AccountAnalysisContext;
import com.vikash_api.dtos.responses.AiAnalysisResponse;
import com.vikash_api.dtos.responses.AllAccountsResponse;
import com.vikash_api.dtos.responses.AllCategoriesResponse;
import com.vikash_api.dtos.responses.TransactionSummaryResponse;
import com.vikash_api.dtos.responses.TransactionResponse;
import com.vikash_api.dtos.responses.AccountSummaryResponse;
import com.vikash_api.dtos.responses.CategoryResponse;
import com.vikash_api.dtos.responses.CreditCardReferenceResponse;
import com.vikash_api.exceptions.TransactionNotFoundException;
import com.vikash_api.dtos.responses.CreditCardAnalysisContext;
import com.vikash_api.dtos.responses.FinancialInstitutionResponse;
import com.vikash_api.entities.AccountEntity;
import com.vikash_api.entities.CustomCategoryEntity;
import com.vikash_api.entities.DefaultCategoriesEntity;
import com.vikash_api.entities.TransactionEntity;
import com.vikash_api.entities.UserEntity;

import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.enums.TransactionType;
import com.vikash_api.exceptions.InvalidTransactionException;
import com.vikash_api.repositories.CreditCardRepository;
import com.vikash_api.repositories.AccountRepository;
import com.vikash_api.repositories.CustomCategoryRepository;
import com.vikash_api.repositories.DefaultCategoryRepository;
import com.vikash_api.repositories.TransactionRepository;

import lombok.RequiredArgsConstructor;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final AuthenticatedUserService authenticatedUserService;
    private final AccountService accountService;
    private final CategoryService categoryService;
    private final AiAnalysisService aiAnalysisService;
    private final AccountRepository accountRepository;
    private final DefaultCategoryRepository defaultCategoryRepository;
    private final CustomCategoryRepository customCategoryRepository;
    private final TransactionRepository transactionRepository;
    private final CreditCardRepository creditCardRepository;
    private final CreditCardPurchaseService creditCardPurchaseService;
    private final CreditCardInvoiceRepository creditCardInvoiceRepository;
    private final CreditCardInvoiceService creditCardInvoiceService;
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public TransactionResponse getByUuid(UUID uuid) {
        UserEntity user = authenticatedUserService.getCurrentUser();
        TransactionEntity transaction = transactionRepository.findByUuidAndUserId(uuid, user.getId())
                .orElseThrow(() -> new TransactionNotFoundException("Transação não encontrada."));
        CategoryResponse category = null;
        if (transaction.getCustomCategory() != null) {
            var custom = transaction.getCustomCategory();
            category = new CategoryResponse(custom.getUuid(), custom.getName(), custom.getIcon(), custom.getColor());
        } else if (transaction.getDefaultCategory() != null) {
            var defaults = transaction.getDefaultCategory();
            category = new CategoryResponse(null, defaults.getName(), defaults.getIcon(), defaults.getColor());
        }
        var invoice = transaction.getCreditCardInvoice();
        CreditCardReferenceResponse creditCard = null;
        if (invoice != null) {
            var card = invoice.getCreditCard();
            var institution = card.getFinancialInstitution();
            creditCard = new CreditCardReferenceResponse(card.getUuid(), card.getDescription(),
                    new FinancialInstitutionResponse(institution.getId(), institution.getName(), institution.getLogoUrl()));
        }
        return new TransactionResponse(transaction.getUuid(), transaction.getDescription(), transaction.getAmount(),
                transaction.getType(), transaction.getPaymentMethod(), transaction.getOccurredAt(),
                accountSummary(transaction.getAccount()), accountSummary(transaction.getDestinationAccount()), category,
                creditCard, invoice == null ? null : invoice.getUuid(), transaction.getTranscription(),
                transaction.getCreatedAt(), transaction.getUpdatedAt());
    }

    private AccountSummaryResponse accountSummary(AccountEntity account) {
        if (account == null) { return null; }
        var institution = account.getFinancialInstitution();
        return new AccountSummaryResponse(account.getUuid(), account.getDescription(), account.getType(),
                institution == null ? null : new FinancialInstitutionResponse(institution.getId(),
                        institution.getName(), institution.getLogoUrl()));
    }

    @Transactional
    public void create(TransactionRequest request) {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        AllAccountsResponse accounts = accountService.get();

        List<AccountAnalysisContext> analysisAccounts = accounts.accounts()
                .stream()
                .map(account -> new AccountAnalysisContext(
                        account.uuid(),
                        account.description(),
                        account.type(),
                        account.financialInstitution()))
                .toList();

        AllCategoriesResponse categories = categoryService.get();
        List<CreditCardAnalysisContext> analysisCards = creditCardRepository.findByUserIdAndActiveTrue(currentUser.getId())
                .stream().map(card -> {
                    var institution = card.getFinancialInstitution();
                    return new CreditCardAnalysisContext(card.getUuid(), card.getDescription(),
                            new FinancialInstitutionResponse(institution.getId(), institution.getName(), institution.getLogoUrl()));
                }).toList();
        AiAnalysisContext context = new AiAnalysisContext(
                analysisAccounts,
                analysisCards,
                categories.defaultCategories(),
                categories.customCategories(),
                creditCardInvoiceRepository.findAnalysisContextByUserId(currentUser.getId()));


        // ----------------- Analise da IA ----------------- //
        AiAnalysisResponse analysis = aiAnalysisService.analyze(request.transcription(), context);
        // ----------------- Fim Analise da IA ----------------- //

        validateAnalysis(analysis);
        if (analysis.type() == TransactionType.INVOICE_PAYMENT) {
            var paymentRequest = new CreditCardInvoicePaymentRequest(
                    analysis.accountUuid(), analysis.paymentMethod(), analysis.occurredAt());
            creditCardInvoiceService.payFromVoice(analysis.creditCardInvoiceUuid(),
                    analysis.creditCardUuid(), paymentRequest, analysis.amount(), request.transcription());
            return;
        }
        boolean creditPurchase = analysis.paymentMethod() == PaymentMethod.CREDIT_CARD;
        AccountEntity account = null;
        AccountEntity destinationAccount = null;
        DefaultCategoriesEntity defaultCategory = null;
        CustomCategoryEntity customCategory = null;

        if (!creditPurchase) {
            // Sempre bloqueia as duas contas na mesma ordem para evitar conflitos entre transferências.
            if (analysis.destinationAccountUuid() != null
                    && analysis.destinationAccountUuid().compareTo(analysis.accountUuid()) < 0) {
                destinationAccount = getAccountForUpdate(analysis.destinationAccountUuid(), currentUser.getId());
                account = getAccountForUpdate(analysis.accountUuid(), currentUser.getId());
            } else {
                account = getAccountForUpdate(analysis.accountUuid(), currentUser.getId());
                if (analysis.destinationAccountUuid() != null) {
                    destinationAccount = getAccountForUpdate(analysis.destinationAccountUuid(), currentUser.getId());
                }
            }
        }

        if (analysis.defaultCategoryName() != null) {
            defaultCategory = defaultCategoryRepository.findByName(analysis.defaultCategoryName())
                    .orElseThrow(() -> new InvalidTransactionException("Categoria padrão não encontrada."));
        }

        if (analysis.customCategoryUuid() != null) {
            customCategory = customCategoryRepository.findByUuidAndUserId(analysis.customCategoryUuid(), currentUser.getId())
                    .orElseThrow(() -> new InvalidTransactionException("Categoria personalizada não encontrada."));
        }

        if (creditPurchase) {
            creditCardPurchaseService.create(analysis, defaultCategory, customCategory, request.transcription());
            return;
        }

        TransactionEntity transaction = new TransactionEntity();
        transaction.setUser(currentUser);
        transaction.setAccount(account);
        transaction.setDescription(analysis.description());
        transaction.setAmount(analysis.amount());
        transaction.setType(analysis.type());
        transaction.setPaymentMethod(analysis.paymentMethod());
        transaction.setDefaultCategory(defaultCategory);
        transaction.setCustomCategory(customCategory);
        transaction.setDestinationAccount(destinationAccount);
        transaction.setOccurredAt(analysis.occurredAt());
        transaction.setTranscription(request.transcription());

        transactionRepository.save(transaction);
        updateBalances(account, destinationAccount, analysis.type(), analysis.amount());
    }

    private AccountEntity getAccountForUpdate(UUID uuid, Long userId) {
        AccountEntity account = accountRepository.findOwnedForUpdate(uuid, userId)
                .orElseThrow(() -> new InvalidTransactionException("Conta não encontrada."));
        // As contas já foram lidas para o contexto da IA; recarrega o saldo atual após o bloqueio.
        entityManager.refresh(account, LockModeType.PESSIMISTIC_WRITE);
        return account;
    }

    private void updateBalances(AccountEntity account, AccountEntity destinationAccount,
            TransactionType type, BigDecimal amount) {
        if (type == TransactionType.INCOME) {
            account.setBalance(account.getBalance().add(amount));
        } else if (type == TransactionType.EXPENSE) {
            account.setBalance(account.getBalance().subtract(amount));
        } else if (type == TransactionType.TRANSFER) {
            account.setBalance(account.getBalance().subtract(amount));
            destinationAccount.setBalance(destinationAccount.getBalance().add(amount));
        }
    }

    @Transactional (readOnly = true)
    public Slice<TransactionSummaryResponse> getSummaries(int page, int size) {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        Pageable pageable = Pageable.ofSize(size).withPage(page);
        return transactionRepository.findSummariesByUserId(currentUser.getId(), pageable);
    }

    private void validateInvoicePayment(AiAnalysisResponse analysis) {
        if (analysis.accountUuid() == null || analysis.creditCardUuid() == null
                || analysis.creditCardInvoiceUuid() == null || analysis.occurredAt() == null
                || analysis.paymentMethod() == null || analysis.paymentMethod() == PaymentMethod.CREDIT_CARD) {
            throw new InvalidTransactionException("Informe a fatura, o cartão, a conta e a data do pagamento.");
        }
        if (analysis.destinationAccountUuid() != null || analysis.defaultCategoryName() != null
                || analysis.customCategoryUuid() != null || !Integer.valueOf(1).equals(analysis.installmentCount())) {
            throw new InvalidTransactionException("Pagamento de fatura não deve ter categoria, conta de destino ou parcelas.");
        }
        if (analysis.amount() != null && (analysis.amount().signum() <= 0
                || analysis.amount().stripTrailingZeros().scale() > 2
                || analysis.amount().compareTo(new BigDecimal("9999999999999.99")) > 0)) {
            throw new InvalidTransactionException("O valor informado para o pagamento é inválido.");
        }
    }

    private void validateAnalysis(AiAnalysisResponse analysis) {
        if (analysis == null) { throw new InvalidTransactionException("Não foi possível identificar o lançamento."); }
        if (analysis.missingFields() != null && !analysis.missingFields().isEmpty()) {
            if (analysis.missingFields().contains("partialInvoicePayment")) {
                throw new InvalidTransactionException("Pagamentos parciais de faturas ainda não são suportados.");
            }
            if (analysis.missingFields().contains("creditCardInvoiceUuid")) {
                throw new InvalidTransactionException("Informe o cartão e o mês/ano da fatura sem ambiguidades.");
            }
            if (analysis.missingFields().contains("installmentCount")) {
                throw new InvalidTransactionException("Informe a quantidade de parcelas da compra.");
            }
            throw new InvalidTransactionException("Faltam informações para registrar o lançamento. Informe valor, forma de pagamento e conta ou cartão sem ambiguidades.");
        }
        if (analysis.type() == TransactionType.INVOICE_PAYMENT) {
            validateInvoicePayment(analysis);
            return;
        }
        if (analysis.creditCardInvoiceUuid() != null) {
            throw new InvalidTransactionException("Somente pagamentos de fatura podem indicar uma fatura existente.");
        }
        if (analysis.installmentCount() == null || analysis.installmentCount() < 1 || analysis.installmentCount() > 120) {
            throw new InvalidTransactionException("A quantidade de parcelas deve estar entre 1 e 120.");
        }
        if (analysis.installmentCount() > 1 && analysis.paymentMethod() != PaymentMethod.CREDIT_CARD) {
            throw new InvalidTransactionException("Parcelamentos são permitidos somente no cartão de crédito.");
        }
        if (analysis.description() == null || analysis.description().isBlank() || analysis.description().length() > 255
                || analysis.amount() == null || analysis.amount().signum() <= 0
                || analysis.amount().stripTrailingZeros().scale() > 2
                || analysis.amount().compareTo(new BigDecimal("9999999999999.99")) > 0
                || analysis.type() == null || analysis.paymentMethod() == null || analysis.occurredAt() == null) {
            throw new InvalidTransactionException("A análise retornou dados incompletos ou inválidos para o lançamento.");
        }
        if (analysis.defaultCategoryName() != null && analysis.customCategoryUuid() != null) {
            throw new InvalidTransactionException("O lançamento deve usar apenas uma categoria.");
        }

        if (analysis.amount().compareTo(new BigDecimal("0.01").multiply(BigDecimal.valueOf(analysis.installmentCount()))) < 0) {
            throw new InvalidTransactionException("O valor de cada parcela deve ser pelo menos R$ 0,01.");
        }
        if (analysis.paymentMethod() == PaymentMethod.CREDIT_CARD) {
            if (analysis.type() != TransactionType.EXPENSE || analysis.creditCardUuid() == null
                    || analysis.accountUuid() != null || analysis.destinationAccountUuid() != null) {
                throw new InvalidTransactionException("Uma compra no crédito deve identificar um cartão cadastrado, sem usar uma conta bancária.");
            }
        } else if (analysis.accountUuid() == null || analysis.creditCardUuid() != null) {
            throw new InvalidTransactionException("Informe a conta utilizada para esse pagamento.");
        }
        if (analysis.type() == TransactionType.TRANSFER) {
            if (analysis.destinationAccountUuid() == null || analysis.destinationAccountUuid().equals(analysis.accountUuid())) {
                throw new InvalidTransactionException("Transferências precisam de duas contas próprias distintas.");
            }
        } else if (analysis.destinationAccountUuid() != null) {
            throw new InvalidTransactionException("Somente transferências entre suas contas podem ter conta de destino.");
        }
    }
}
