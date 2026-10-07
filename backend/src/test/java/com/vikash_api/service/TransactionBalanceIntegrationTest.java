package com.vikash_api.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.vikash_api.dtos.requests.TransactionRequest;
import com.vikash_api.dtos.responses.AiAnalysisResponse;
import com.vikash_api.entities.AccountEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.enums.AccountType;
import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.enums.TransactionType;
import com.vikash_api.repositories.AccountRepository;
import com.vikash_api.repositories.TransactionRepository;
import com.vikash_api.repositories.UserRepository;
import com.vikash_api.services.AiAnalysisService;
import com.vikash_api.services.AuthenticatedUserService;
import com.vikash_api.services.TransactionService;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = { "spring.datasource.url=jdbc:h2:mem:transaction-balances;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "security.ai.per-user-concurrent=2" })
class TransactionBalanceIntegrationTest {
    @Autowired TransactionService service;
    @Autowired AccountRepository accounts;
    @Autowired UserRepository users;
    @Autowired TransactionRepository transactions;
    @MockitoBean AuthenticatedUserService authenticatedUserService;
    @MockitoBean AiAnalysisService aiAnalysisService;
    UserEntity user;
    AccountEntity account;

    @BeforeEach
    void setup() {
        user = users.save(UserEntity.builder().name("Teste")
                .email(UUID.randomUUID() + "@balance.test").password("test-only").build());
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        when(authenticatedUserService.getCurrentUserId()).thenReturn(user.getId());
        account = new AccountEntity();
        account.setUser(user);
        account.setDescription("Carteira");
        account.setType(AccountType.CARTEIRA);
        account.setActive(true);
        account.setBalance(new BigDecimal("1000.00"));
        account = accounts.saveAndFlush(account);
    }

    @Test
    void simultaneousIncomesDoNotOverwriteEachOtherAfterReadingAiContext() throws Exception {
        var bothReadContext = new CyclicBarrier(2);
        when(aiAnalysisService.analyze(any(), any())).thenAnswer(call -> {
            assertThat(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            bothReadContext.await(10, TimeUnit.SECONDS);
            return income("100.00");
        });
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> service.create(new TransactionRequest("Recebi 100 reais")));
            var second = executor.submit(() -> service.create(new TransactionRequest("Recebi mais 100 reais")));
            first.get(15, TimeUnit.SECONDS);
            second.get(15, TimeUnit.SECONDS);
        }
        assertThat(accounts.findByUuid(account.getUuid()).orElseThrow().getBalance())
                .isEqualByComparingTo("1200.00");
        assertThat(transactions.findSummariesByUserId(user.getId(), org.springframework.data.domain.PageRequest.of(0, 20)))
                .hasSize(2);
    }

    @Test
    void failureToPersistBalanceRollsBackTheTransactionToo() {
        account.setBalance(new BigDecimal("9999999999999.99"));
        accounts.saveAndFlush(account);
        when(aiAnalysisService.analyze(any(), any())).thenReturn(income("0.01"));

        assertThatThrownBy(() -> service.create(new TransactionRequest("Recebi um centavo")))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(accounts.findByUuid(account.getUuid()).orElseThrow().getBalance())
                .isEqualByComparingTo("9999999999999.99");
        assertThat(transactions.findSummariesByUserId(user.getId(), org.springframework.data.domain.PageRequest.of(0, 20)))
                .isEmpty();
    }

    private AiAnalysisResponse income(String amount) {
        return new AiAnalysisResponse("Recebimento", new BigDecimal(amount), TransactionType.INCOME,
                PaymentMethod.PIX, LocalDateTime.of(2026, 10, 4, 12, 0), account.getUuid(),
                null, null, null, null, 1, List.of());
    }
}
