package com.vikash_api.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.vikash_api.dtos.requests.AiAnalysisContext;
import com.vikash_api.dtos.requests.TransactionRequest;
import com.vikash_api.dtos.responses.AccountResponse;
import com.vikash_api.dtos.responses.AiAnalysisResponse;
import com.vikash_api.dtos.responses.AllAccountsResponse;
import com.vikash_api.dtos.responses.AllCategoriesResponse;
import com.vikash_api.dtos.responses.CategoryResponse;
import com.vikash_api.entities.AccountEntity;
import com.vikash_api.entities.CustomCategoryEntity;
import com.vikash_api.entities.DefaultCategoriesEntity;
import com.vikash_api.entities.TransactionEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.enums.AccountType;
import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.enums.TransactionType;
import com.vikash_api.repositories.AccountRepository;
import com.vikash_api.repositories.CustomCategoryRepository;
import com.vikash_api.repositories.DefaultCategoryRepository;
import com.vikash_api.repositories.TransactionRepository;
import com.vikash_api.repositories.CreditCardRepository;
import com.vikash_api.services.CreditCardInvoiceService;
import com.vikash_api.services.AccountService;
import com.vikash_api.services.AiAnalysisService;
import com.vikash_api.services.CategoryService;
import com.vikash_api.services.TransactionService;
import com.vikash_api.services.AuthenticatedUserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {
    @Mock AccountService accountService;
    @Mock CategoryService categoryService;
    @Mock AiAnalysisService aiAnalysisService;
    @Mock AuthenticatedUserService authenticatedUserService;
    @Mock AccountRepository accountRepository;
    @Mock CustomCategoryRepository customCategoryRepository;
    @Mock DefaultCategoryRepository defaultCategoryRepository;
    @Mock TransactionRepository transactionRepository;
    @Mock CreditCardRepository creditCardRepository;
    @Mock CreditCardInvoiceService creditCardInvoiceService;
    @Mock com.vikash_api.repositories.CreditCardInvoiceRepository creditCardInvoiceRepository;
    @Mock jakarta.persistence.EntityManager entityManager;
    @Mock org.springframework.transaction.PlatformTransactionManager transactionManager;
    @Mock com.vikash_api.services.AiUsageService aiUsageService;
    @InjectMocks TransactionService service;

    @BeforeEach
    void configureTransactions() {
        lenient().when(transactionManager.getTransaction(any()))
                .thenReturn(mock(org.springframework.transaction.TransactionStatus.class));
    }

    @Test
    void rejectsUsageBeforeReadingContextOrCallingGemini() {
        when(authenticatedUserService.getCurrentUserId()).thenReturn(1L);
        when(aiUsageService.acquire(1L)).thenThrow(new com.vikash_api.exceptions.RequestLimitException("Aguarde", 60));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.create(new TransactionRequest("Almoço")))
                .isInstanceOf(com.vikash_api.exceptions.RequestLimitException.class);
        verifyNoInteractions(accountService, categoryService, aiAnalysisService, transactionManager, transactionRepository);
    }

    @Test
    void passesContextWithoutBalanceAndSavesTransactionWithDefaultCategory() {
        UUID accountUuid = UUID.randomUUID();
        var account = new AccountResponse(accountUuid, "Carteira", AccountType.CARTEIRA, new BigDecimal("999.00"), null);
        var defaults = List.of(new CategoryResponse(null, "Alimentação", "food", "blue"));
        when(accountService.get()).thenReturn(new AllAccountsResponse(List.of(account)));
        when(categoryService.get()).thenReturn(new AllCategoriesResponse(defaults, List.of()));
        var user = new UserEntity();
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        var accountEntity = new AccountEntity();
        accountEntity.setUuid(accountUuid);
        accountEntity.setBalance(new BigDecimal("999.00"));
        when(accountRepository.findOwnedForUpdate(accountUuid, user.getId())).thenReturn(Optional.of(accountEntity));
        var category = new DefaultCategoriesEntity();
        ReflectionTestUtils.setField(category, "name", "Alimentação");
        when(defaultCategoryRepository.findByName("Alimentação")).thenReturn(Optional.of(category));
        var occurredAt = LocalDateTime.of(2026, 10, 3, 12, 30);
        var analysis = new AiAnalysisResponse("Almoço", new BigDecimal("45.10"), TransactionType.EXPENSE,
                PaymentMethod.CASH, occurredAt, accountUuid, null, null, "Alimentação", null, 1, List.of());
        var context = ArgumentCaptor.forClass(AiAnalysisContext.class);
        when(aiAnalysisService.analyze(eq("Almoço de 45 reais"), context.capture())).thenReturn(analysis);
        service.create(new TransactionRequest("Almoço de 45 reais"));
        var transaction = ArgumentCaptor.forClass(TransactionEntity.class);
        verify(transactionRepository).save(transaction.capture());
        assertThat(transaction.getValue().getDescription()).isEqualTo("Almoço");
        assertThat(transaction.getValue().getAmount()).isEqualByComparingTo("45.10");
        assertThat(transaction.getValue().getType()).isEqualTo(TransactionType.EXPENSE);
        assertThat(transaction.getValue().getPaymentMethod()).isEqualTo(PaymentMethod.CASH);
        assertThat(transaction.getValue().getOccurredAt()).isEqualTo(occurredAt);
        assertThat(transaction.getValue().getAccount()).isSameAs(accountEntity);
        assertThat(transaction.getValue().getCustomCategory()).isNull();
        assertThat(transaction.getValue().getDestinationAccount()).isNull();
        assertThat(transaction.getValue().getTranscription()).isEqualTo("Almoço de 45 reais");
        assertThat(transaction.getValue().getUser()).isSameAs(user);
        assertThat(transaction.getValue().getDefaultCategory()).isSameAs(category);
        assertThat(accountEntity.getBalance()).isEqualByComparingTo("953.90");
        verify(accountRepository).findOwnedForUpdate(accountUuid, user.getId());
        verify(defaultCategoryRepository).findByName("Alimentação");
        verifyNoInteractions(customCategoryRepository);
        assertThat(context.getValue().accounts().getFirst().uuid()).isEqualTo(accountUuid);
        assertThat(context.getValue().defaultCategories()).isEqualTo(defaults);
        assertThat(JsonMapper.builder().build().valueToTree(context.getValue()).toString()).doesNotContain("balance");
    }

    @Test
    void savesDestinationAndCustomCategory() {
        var account = new AccountEntity();
        account.setUuid(UUID.randomUUID());
        var destination = new AccountEntity();
        destination.setUuid(UUID.randomUUID());
        account.setBalance(new BigDecimal("250.00"));
        destination.setBalance(new BigDecimal("50.00"));
        var category = new CustomCategoryEntity();
        category.setUuid(UUID.randomUUID());
        when(authenticatedUserService.getCurrentUser()).thenReturn(new UserEntity());
        when(accountService.get()).thenReturn(new AllAccountsResponse(List.of()));
        when(categoryService.get()).thenReturn(new AllCategoriesResponse(List.of(), List.of()));
        when(accountRepository.findOwnedForUpdate(account.getUuid(), null)).thenReturn(Optional.of(account));
        when(accountRepository.findOwnedForUpdate(destination.getUuid(), null)).thenReturn(Optional.of(destination));
        when(customCategoryRepository.findByUuidAndUserId(category.getUuid(), null)).thenReturn(Optional.of(category));
        var analysis = new AiAnalysisResponse("Transferência", new BigDecimal("100.00"), TransactionType.TRANSFER,
                PaymentMethod.PIX, LocalDateTime.now(), account.getUuid(), null, destination.getUuid(), null,
                category.getUuid(), 1, List.of());
        when(aiAnalysisService.analyze(eq("Transferi 100 reais"), any(AiAnalysisContext.class))).thenReturn(analysis);
        service.create(new TransactionRequest("Transferi 100 reais"));
        var transaction = ArgumentCaptor.forClass(TransactionEntity.class);
        verify(transactionRepository).save(transaction.capture());
        assertThat(transaction.getValue().getAccount()).isSameAs(account);
        assertThat(transaction.getValue().getDestinationAccount()).isSameAs(destination);
        assertThat(transaction.getValue().getCustomCategory()).isSameAs(category);
        assertThat(transaction.getValue().getDefaultCategory()).isNull();
        assertThat(account.getBalance()).isEqualByComparingTo("150.00");
        assertThat(destination.getBalance()).isEqualByComparingTo("150.00");
        verify(accountRepository).findOwnedForUpdate(account.getUuid(), null);
        verify(accountRepository).findOwnedForUpdate(destination.getUuid(), null);
        verify(customCategoryRepository).findByUuidAndUserId(category.getUuid(), null);
        verifyNoInteractions(defaultCategoryRepository);
    }

    @Test
    void generatesTransactionUuidAutomaticallyAndPreservesExistingUuid() {
        var transaction = new TransactionEntity();
        ReflectionTestUtils.invokeMethod(transaction, "prePersist");
        assertThat(transaction.getUuid()).isNotNull();
        UUID uuid = transaction.getUuid();
        ReflectionTestUtils.invokeMethod(transaction, "prePersist");
        assertThat(transaction.getUuid()).isEqualTo(uuid);
    }
}
