package com.vikash_api.controller;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.client.RestClient;
import com.vikash_api.dtos.responses.AiAnalysisResponse;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.entities.AccountEntity;
import com.vikash_api.enums.AccountType;
import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.enums.TransactionType;
import com.vikash_api.repositories.AccountRepository;
import com.vikash_api.repositories.UserRepository;
import com.vikash_api.services.AiAnalysisService;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:transaction-boundary;DB_CLOSE_DELAY=-1",
        "spring.jpa.open-in-view=true", "security.ai.per-minute=2" })
class TransactionBoundaryIntegrationTest {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired AccountRepository accounts;
    @MockitoBean AiAnalysisService ai;
    RestClient client;
    AuthResponse auth;
    AccountEntity account;

    @BeforeEach
    void setup() {
        client = RestClient.create("http://localhost:" + port);
        String email = UUID.randomUUID() + "@boundary.test";
        auth = client.post().uri("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", "Teste", "email", email, "password", "Password123!"))
                .retrieve().body(AuthResponse.class);
        account = new AccountEntity();
        account.setUser(users.findByUuid(auth.getUser().getUuid()).orElseThrow());
        account.setType(AccountType.CARTEIRA); account.setDescription("Carteira");
        account.setActive(true); account.setBalance(new BigDecimal("100.00"));
        account = accounts.saveAndFlush(account);
    }

    @Test
    void webRequestCallsAiWithoutTransactionAndStillPersistsBalanceWithOpenInView() {
        when(ai.analyze(any(), any())).thenAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return income(account.getUuid());
        });
        assertThat(create()).isEqualTo(201);
        assertThat(accounts.findByUuid(account.getUuid()).orElseThrow().getBalance()).isEqualByComparingTo("110.00");
        assertThat(create()).isEqualTo(201);
        assertThat(create()).isEqualTo(429);
        verify(ai, times(2)).analyze(any(), any());
    }

    @Test
    void providerFailureReleasesSlotAndCannotMutateFinancialData() {
        when(ai.analyze(any(), any())).thenThrow(new IllegalStateException("fake provider failure"))
                .thenReturn(income(account.getUuid()));
        assertThat(create()).isEqualTo(500);
        assertThat(accounts.findByUuid(account.getUuid()).orElseThrow().getBalance()).isEqualByComparingTo("100.00");
        assertThat(create()).isEqualTo(201);
        assertThat(accounts.findByUuid(account.getUuid()).orElseThrow().getBalance()).isEqualByComparingTo("110.00");
    }

    @Test
    void resultStillRequiresAnAccountOwnedByTheAuthenticatedUser() {
        when(ai.analyze(any(), any())).thenReturn(income(UUID.randomUUID()));
        assertThat(create()).isEqualTo(400);
        assertThat(accounts.findByUuid(account.getUuid()).orElseThrow().getBalance()).isEqualByComparingTo("100.00");
    }

    private AiAnalysisResponse income(UUID uuid) {
        return new AiAnalysisResponse("Recebimento", new BigDecimal("10.00"), TransactionType.INCOME,
                PaymentMethod.PIX, LocalDateTime.now(), uuid, null, null, null, null, 1, List.of());
    }

    private int create() {
        return client.post().uri("/api/transaction/create").header("Authorization", "Bearer " + auth.getAccessToken())
                .contentType(MediaType.APPLICATION_JSON).body(Map.of("transcription", "Recebi dez reais na carteira"))
                .exchange((request, response) -> response.getStatusCode().value());
    }
}
