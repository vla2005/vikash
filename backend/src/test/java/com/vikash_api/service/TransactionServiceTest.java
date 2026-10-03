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
import com.vikash_api.services.AccountService;
import com.vikash_api.services.AiAnalysisService;
import com.vikash_api.services.CategoryService;
import com.vikash_api.services.TransactionService;
import com.vikash_api.services.AuthenticatedUserService;
import org.junit.jupiter.api.Test;
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
    @InjectMocks TransactionService service;

    @Test
    void passesContextWithoutBalanceAndReturnsSavedTransactionWithDefaultCategory() {
        UUID accountUuid = UUID.randomUUID();
        var account = new AccountResponse(accountUuid, "Carteira", AccountType.CARTEIRA, new BigDecimal("999.00"), null);
        var defaults = List.of(new CategoryResponse(null, "Alimentação", "food", "blue"));
        when(accountService.get()).thenReturn(new AllAccountsResponse(List.of(account)));
        when(categoryService.get()).thenReturn(new AllCategoriesResponse(defaults, List.of()));
        var user = new UserEntity();
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        var accountEntity = new AccountEntity();
        accountEntity.setUuid(accountUuid);
        when(accountRepository.findByUuid(accountUuid)).thenReturn(Optional.of(accountEntity));
        var category = new DefaultCategoriesEntity();
        ReflectionTestUtils.setField(category, "name", "Alimentação");
        when(defaultCategoryRepository.findByName("Alimentação")).thenReturn(Optional.of(category));
        var occurredAt = LocalDateTime.of(2026, 10, 3, 12, 30);
        var analysis = new AiAnalysisResponse("Almoço", new BigDecimal("45.10"), TransactionType.EXPENSE,
                PaymentMethod.CASH, occurredAt, accountUuid, null, "Alimentação", null, List.of());
        var context = ArgumentCaptor.forClass(AiAnalysisContext.class);
        when(aiAnalysisService.analyze(eq("Almoço de 45 reais"), context.capture())).thenReturn(analysis);
        UUID transactionUuid = UUID.randomUUID();
        var createdAt = occurredAt.plusMinutes(5);
        when(transactionRepository.save(any(TransactionEntity.class))).thenAnswer(invocation -> {
            TransactionEntity saved = invocation.getArgument(0);
            saved.setUuid(transactionUuid);
            saved.setCreatedAt(createdAt);
            saved.setUpdatedAt(createdAt);
            return saved;
        });

        var response = service.create(new TransactionRequest("Almoço de 45 reais"));
        assertThat(response.uuid()).isEqualTo(transactionUuid);
        assertThat(response.description()).isEqualTo("Almoço");
        assertThat(response.amount()).isEqualTo(new BigDecimal("45.10"));
        assertThat(response.type()).isEqualTo(TransactionType.EXPENSE);
        assertThat(response.paymentMethod()).isEqualTo(PaymentMethod.CASH);
        assertThat(response.occurredAt()).isEqualTo(occurredAt);
        assertThat(response.accountUuid()).isEqualTo(accountUuid);
        assertThat(response.defaultCategoryName()).isEqualTo("Alimentação");
        assertThat(response.customCategoryUuid()).isNull();
        assertThat(response.destinationAccountUuid()).isNull();
        assertThat(response.transcription()).isEqualTo("Almoço de 45 reais");
        assertThat(response.createdAt()).isEqualTo(createdAt);
        assertThat(response.updatedAt()).isEqualTo(createdAt);
        var transaction = ArgumentCaptor.forClass(TransactionEntity.class);
        verify(transactionRepository).save(transaction.capture());
        assertThat(transaction.getValue().getUser()).isSameAs(user);
        assertThat(transaction.getValue().getDefaultCategory()).isSameAs(category);
        verify(accountRepository).findByUuid(accountUuid);
        verify(defaultCategoryRepository).findByName("Alimentação");
        verifyNoInteractions(customCategoryRepository);
        assertThat(context.getValue().accounts().getFirst().uuid()).isEqualTo(accountUuid);
        assertThat(context.getValue().defaultCategories()).isEqualTo(defaults);
        assertThat(JsonMapper.builder().build().valueToTree(context.getValue()).toString()).doesNotContain("balance");
    }

    @Test
    void returnsDestinationAndCustomCategoryFromSavedTransaction() {
        var account = new AccountEntity();
        account.setUuid(UUID.randomUUID());
        var destination = new AccountEntity();
        destination.setUuid(UUID.randomUUID());
        var category = new CustomCategoryEntity();
        category.setUuid(UUID.randomUUID());
        when(authenticatedUserService.getCurrentUser()).thenReturn(new UserEntity());
        when(accountService.get()).thenReturn(new AllAccountsResponse(List.of()));
        when(categoryService.get()).thenReturn(new AllCategoriesResponse(List.of(), List.of()));
        when(accountRepository.findByUuid(account.getUuid())).thenReturn(Optional.of(account));
        when(accountRepository.findByUuid(destination.getUuid())).thenReturn(Optional.of(destination));
        when(customCategoryRepository.findByUuid(category.getUuid())).thenReturn(Optional.of(category));
        var analysis = new AiAnalysisResponse("Transferência", new BigDecimal("100.00"), TransactionType.TRANSFER,
                PaymentMethod.PIX, LocalDateTime.now(), account.getUuid(), destination.getUuid(), null,
                category.getUuid(), List.of());
        when(aiAnalysisService.analyze(eq("Transferi 100 reais"), any(AiAnalysisContext.class))).thenReturn(analysis);
        when(transactionRepository.save(any(TransactionEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.create(new TransactionRequest("Transferi 100 reais"));

        assertThat(response.accountUuid()).isEqualTo(account.getUuid());
        assertThat(response.destinationAccountUuid()).isEqualTo(destination.getUuid());
        assertThat(response.customCategoryUuid()).isEqualTo(category.getUuid());
        assertThat(response.defaultCategoryName()).isNull();
        verify(accountRepository).findByUuid(account.getUuid());
        verify(accountRepository).findByUuid(destination.getUuid());
        verify(customCategoryRepository).findByUuid(category.getUuid());
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
