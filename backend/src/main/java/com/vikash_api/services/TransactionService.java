package com.vikash_api.services;

import java.util.List;

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
import com.vikash_api.entities.AccountEntity;
import com.vikash_api.entities.CustomCategoryEntity;
import com.vikash_api.entities.DefaultCategoriesEntity;
import com.vikash_api.entities.TransactionEntity;
import com.vikash_api.entities.UserEntity;
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
        AiAnalysisContext context = new AiAnalysisContext(
                analysisAccounts,
                categories.defaultCategories(),
                categories.customCategories());


        // ----------------- Analise da IA ----------------- //
        AiAnalysisResponse analysis = aiAnalysisService.analyze(request.transcription(), context);
        // ----------------- Fim Analise da IA ----------------- //

        AccountEntity account = accountRepository.findByUuid(analysis.accountUuid())
                .orElseThrow(() -> new RuntimeException("Conta não encontrada."));

        AccountEntity destinationAccount = null;
        DefaultCategoriesEntity defaultCategory = null;
        CustomCategoryEntity customCategory = null;

        if (analysis.destinationAccountUuid() != null) {
            destinationAccount = accountRepository.findByUuid(analysis.destinationAccountUuid())
                    .orElseThrow(() -> new RuntimeException("Conta de destino não encontrada."));
        }

        if (analysis.defaultCategoryName() != null) {
            defaultCategory = defaultCategoryRepository.findByName(analysis.defaultCategoryName())
                    .orElseThrow(() -> new RuntimeException("Categoria padrão não encontrada."));
        }

        if (analysis.customCategoryUuid() != null) {
            customCategory = customCategoryRepository.findByUuid(analysis.customCategoryUuid())
                    .orElseThrow(() -> new RuntimeException("Categoria personalizada não encontrada."));
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
                transaction.getAccount().getUuid(),
                transaction.getDestinationAccount() == null ? null : transaction.getDestinationAccount().getUuid(),
                transaction.getDefaultCategory() == null ? null : transaction.getDefaultCategory().getName(),
                transaction.getCustomCategory() == null ? null : transaction.getCustomCategory().getUuid(),
                transaction.getTranscription(),
                transaction.getCreatedAt(),
                transaction.getUpdatedAt());
    }
}
