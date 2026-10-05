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
import com.vikash_api.dtos.responses.TransactionResponse;
import com.vikash_api.dtos.responses.TransactionSummaryResponse;
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

    @Transactional
    public TransactionResponse create(TransactionRequest request) {
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
            return toResponse(creditCardInvoiceService.payFromVoice(analysis.creditCardInvoiceUuid(),
                    analysis.creditCardUuid(), paymentRequest, analysis.amount(), request.transcription()));
        }
        boolean creditPurchase = analysis.paymentMethod() == PaymentMethod.CREDIT_CARD;
        AccountEntity account = creditPurchase ? null : accountRepository.findByUuidAndUserId(analysis.accountUuid(), currentUser.getId())
                .orElseThrow(() -> new InvalidTransactionException("Conta não encontrada."));

        AccountEntity destinationAccount = null;
        DefaultCategoriesEntity defaultCategory = null;
        CustomCategoryEntity customCategory = null;

        if (analysis.destinationAccountUuid() != null) {
            destinationAccount = accountRepository.findByUuidAndUserId(analysis.destinationAccountUuid(), currentUser.getId())
                    .orElseThrow(() -> new InvalidTransactionException("Conta de destino não encontrada."));
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
            return creditCardPurchaseService.create(analysis, defaultCategory, customCategory, request.transcription());
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

        TransactionEntity savedTransaction = transactionRepository.save(transaction);

        return toResponse(savedTransaction);
    }

    @Transactional (readOnly = true)
    public Slice<TransactionSummaryResponse> getSummaries(int page, int size) {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        Pageable pageable = Pageable.ofSize(size).withPage(page);
        return transactionRepository.findSummariesByUserId(currentUser.getId(), pageable);
    }

    private TransactionResponse toResponse(TransactionEntity transaction) {
        return new TransactionResponse(
                transaction.getUuid(),
                transaction.getDescription(),
                transaction.getAmount(),
                transaction.getType(),
                transaction.getPaymentMethod(),
                transaction.getOccurredAt(),
                transaction.getAccount() == null ? null : transaction.getAccount().getUuid(),
                transaction.getCreditCardInvoice() == null ? null : transaction.getCreditCardInvoice().getCreditCard().getUuid(),
                transaction.getCreditCardInvoice() == null ? null : transaction.getCreditCardInvoice().getUuid(),
                transaction.getDestinationAccount() == null ? null : transaction.getDestinationAccount().getUuid(),
                transaction.getDefaultCategory() == null ? null : transaction.getDefaultCategory().getName(),
                transaction.getCustomCategory() == null ? null : transaction.getCustomCategory().getUuid(),
                transaction.getTranscription(),
                transaction.getCreatedAt(),
                transaction.getUpdatedAt(),
                null, transaction.getAmount(), 1, 1);
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
