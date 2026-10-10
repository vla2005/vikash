package com.vikash_api.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import com.vikash_api.dtos.requests.*;
import com.vikash_api.dtos.responses.AiAnalysisResponse;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.entities.*;
import com.vikash_api.enums.*;
import com.vikash_api.exceptions.*;
import com.vikash_api.repositories.*;
import com.vikash_api.services.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.when;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties =
        "spring.datasource.url=${deletion.test.datasource.url:jdbc:h2:mem:entry-deletion;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000}")
class EntryDeletionIntegrationTest {
    @LocalServerPort int port;
    @Autowired TransactionService transactionService;
    @Autowired CreditCardPurchaseService purchaseService;
    @Autowired CreditCardService cardService;
    @Autowired CreditCardInvoiceService invoiceService;
    @Autowired TransactionRepository transactions;
    @Autowired CreditCardPurchaseRepository purchases;
    @Autowired CreditCardInstallmentRepository installments;
    @Autowired CreditCardInvoiceRepository invoices;
    @Autowired CreditCardRepository cards;
    @Autowired AccountRepository accounts;
    @Autowired InstitutionRepository institutions;
    @Autowired UserRepository users;
    @MockitoBean AuthenticatedUserService authenticatedUserService;
    RestClient client;
    AuthResponse auth;
    UserEntity user;
    AccountEntity account;
    CreditCardEntity card;
    YearMonth past = YearMonth.now().minusMonths(1);

    @BeforeEach
    void setup() {
        client = RestClient.create("http://localhost:" + port);
        auth = client.post().uri("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", "Teste", "email", UUID.randomUUID() + "@deletion.test", "password", "Password123!"))
                .retrieve().body(AuthResponse.class);
        user = users.findByUuid(auth.getUser().getUuid()).orElseThrow();
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        when(authenticatedUserService.getCurrentUserId()).thenReturn(user.getId());
        account = account("2000");
        var institution = new FinancialInstitutionEntity();
        ReflectionTestUtils.setField(institution, "name", "Banco " + UUID.randomUUID());
        ReflectionTestUtils.setField(institution, "logoUrl", "/images/financial-institutions/inter.webp");
        institution = institutions.save(institution);
        cardService.create(new CreditCardCreateRequest(institution.getId(), 32, new BigDecimal("5000"),
                3, 10, new BigDecimal("4500")));
        card = cards.findByUserIdAndActiveTrue(user.getId()).getFirst();
        invoiceService.distributeInitialAmounts(card.getUuid(), new CreditCardInitialInvoicesRequest(List.of(
                new CreditCardInitialInvoiceRequest(past.toString(), new BigDecimal("200"), past.atDay(3), past.atDay(10)))));
    }

    @Test
    void deletingExpenseRestoresBalanceAndReturnsNoBody() {
        var entry = entry(TransactionType.EXPENSE, "50", null);
        account.setBalance(new BigDecimal("1950")); accounts.saveAndFlush(account);
        var response = client.delete().uri("/api/transaction/" + entry.getUuid())
                .header("Authorization", "Bearer " + auth.getAccessToken()).retrieve().toEntity(String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(204);
        assertThat(response.getBody()).isNull();
        assertBalance("2000");
        assertThat(transactions.existsById(entry.getId())).isFalse();
        assertThat(delete("transaction", entry.getUuid())).isEqualTo(404);
        assertBalance("2000");
    }

    @Test
    void deletingIncomeSubtractsItsAmountEvenFromAnArchivedAccount() {
        var entry = entry(TransactionType.INCOME, "100", null);
        account.setBalance(new BigDecimal("2100")); account.setActive(false); accounts.saveAndFlush(account);
        transactionService.delete(entry.getUuid());
        assertBalance("2000");
    }

    @Test
    void deletingTransferReversesBothAccounts() {
        var destination = account("550");
        var entry = entry(TransactionType.TRANSFER, "50", destination);
        account.setBalance(new BigDecimal("1950")); accounts.saveAndFlush(account);
        transactionService.delete(entry.getUuid());
        assertBalance("2000");
        assertThat(accounts.findById(destination.getId()).orElseThrow().getBalance()).isEqualByComparingTo("500");
    }

    @Test
    void failureToReverseBalanceRollsBackDeletion() {
        var entry = entry(TransactionType.EXPENSE, "1", null);
        account.setBalance(new BigDecimal("9999999999999.99")); accounts.saveAndFlush(account);
        assertThatThrownBy(() -> transactionService.delete(entry.getUuid()))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertBalance("9999999999999.99");
        assertThat(transactions.existsById(entry.getId())).isTrue();
    }

    @Test
    void purchaseDeletionRemovesEveryInstallmentAndPreservesOtherPurchasesAndInitialDebt() {
        var purchase = purchase("300", 3);
        var other = purchase("90", 1);
        assertThat(cardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("4110");
        assertThat(delete("credit-card-purchase", purchase.getUuid())).isEqualTo(204);
        assertThat(purchases.existsById(purchase.getId())).isFalse();
        assertThat(installments.findByPurchaseId(purchase.getId())).isEmpty();
        assertThat(installments.findByPurchaseId(other.getId())).hasSize(1);
        var details = cardService.getByUuid(card.getUuid());
        assertThat(details.availableLimit()).isEqualByComparingTo("4410");
        assertThat(details.unallocatedUsedLimit()).isEqualByComparingTo("300");
        assertThat(details.invoices()).hasSize(3);
        assertThat(invoiceService.getByUuid(invoice().getUuid()).total()).isEqualByComparingTo("290");
        assertThat(invoice().getInitialAmount()).isEqualByComparingTo("200");
        assertBalance("2000");
    }

    @Test
    void paidPurchaseIsBlockedUntilPaymentIsDeletedThenItCanBeRemoved() {
        var purchase = purchase("300", 3);
        invoiceService.pay(invoice().getUuid(), payment());
        assertBalance("1700");
        assertThat(delete("credit-card-purchase", purchase.getUuid())).isEqualTo(400);
        assertThat(purchases.existsById(purchase.getId())).isTrue();
        assertThat(installments.findByPurchaseId(purchase.getId())).hasSize(3);
        assertThat(invoice().getStatus()).isEqualTo(CreditCardInvoiceStatus.PAID);
        assertBalance("1700");
        var payment = transactions.findSummariesByUserId(user.getId(), org.springframework.data.domain.PageRequest.of(0, 20))
                .getContent().getFirst();
        assertThat(delete("transaction", payment.uuid())).isEqualTo(204);
        assertBalance("2000");
        assertThat(invoice().getStatus()).isEqualTo(CreditCardInvoiceStatus.CLOSED);
        assertThat(cardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("4200");
        purchaseService.delete(purchase.getUuid());
        assertThat(cardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("4500");
        // A fatura reaberta ainda pode ser paga novamente, com seu saldo inicial.
        invoiceService.pay(invoice().getUuid(), payment());
        assertBalance("1800");
    }

    @Test
    void missingAndForeignEntriesCannotChangeBalancesOrLimits() {
        var entry = entry(TransactionType.EXPENSE, "50", null);
        var purchase = purchase("300", 3);
        var other = users.save(UserEntity.builder().name("Outro").email(UUID.randomUUID() + "@deletion.test").password("test-only").build());
        when(authenticatedUserService.getCurrentUser()).thenReturn(other);
        assertThat(delete("transaction", entry.getUuid())).isEqualTo(404);
        assertThat(delete("credit-card-purchase", purchase.getUuid())).isEqualTo(404);
        assertThat(delete("transaction", UUID.randomUUID())).isEqualTo(404);
        assertThat(delete("credit-card-purchase", UUID.randomUUID())).isEqualTo(404);
        assertBalance("2000");
        assertThat(transactions.existsById(entry.getId())).isTrue();
        assertThat(installments.findByPurchaseId(purchase.getId())).hasSize(3);
    }

    @Test
    void endpointsRequireAuthenticationAndValidUuid() {
        for (var path : List.of("transaction", "credit-card-purchase")) {
            int unauthorized = client.delete().uri("/api/" + path + "/" + UUID.randomUUID())
                    .exchange((request, response) -> response.getStatusCode().value());
            int malformed = client.delete().uri("/api/" + path + "/not-a-uuid").header("Authorization", "Bearer " + auth.getAccessToken())
                    .exchange((request, response) -> response.getStatusCode().value());
            assertThat(unauthorized).isEqualTo(401);
            assertThat(malformed).isEqualTo(400);
        }
    }

    @Test
    void simultaneousTransactionDeletionsRefundOnlyOnce() throws Exception {
        var entry = entry(TransactionType.EXPENSE, "50", null);
        account.setBalance(new BigDecimal("1950")); accounts.saveAndFlush(account);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> { start.await(); return delete("transaction", entry.getUuid()); });
            var second = executor.submit(() -> { start.await(); return delete("transaction", entry.getUuid()); });
            start.countDown();
            assertThat(List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS))).containsExactlyInAnyOrder(204, 404);
        }
        assertBalance("2000");
    }

    @Test
    void simultaneousPurchaseDeletionsReleaseLimitOnlyOnce() throws Exception {
        var purchase = purchase("300", 3);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> { start.await(); return delete("credit-card-purchase", purchase.getUuid()); });
            var second = executor.submit(() -> { start.await(); return delete("credit-card-purchase", purchase.getUuid()); });
            start.countDown();
            assertThat(List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS))).containsExactlyInAnyOrder(204, 404);
        }
        assertThat(cardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("4500");
    }

    @Test
    void concurrentPaymentAndPurchaseDeletionKeepInvoiceAndAccountConsistent() throws Exception {
        var purchase = purchase("300", 3);
        var invoiceUuid = invoice().getUuid();
        var start = new CountDownLatch(1);
        int deletion;
        try (var executor = Executors.newFixedThreadPool(2)) {
            var remove = executor.submit(() -> { start.await(); return delete("credit-card-purchase", purchase.getUuid()); });
            var pay = executor.submit(() -> { start.await(); invoiceService.pay(invoiceUuid, payment()); return true; });
            start.countDown();
            deletion = remove.get(15, TimeUnit.SECONDS);
            assertThat(pay.get(15, TimeUnit.SECONDS)).isTrue();
        }
        assertThat(invoice().getStatus()).isEqualTo(CreditCardInvoiceStatus.PAID);
        if (deletion == 204) {
            assertBalance("1800");
            assertThat(installments.findByPurchaseId(purchase.getId())).isEmpty();
        } else {
            assertThat(deletion).isEqualTo(400);
            assertBalance("1700");
            assertThat(installments.findByPurchaseId(purchase.getId())).hasSize(3);
        }
    }

    private int delete(String path, UUID uuid) {
        return client.delete().uri("/api/" + path + "/" + uuid).header("Authorization", "Bearer " + auth.getAccessToken())
                .exchange((request, response) -> response.getStatusCode().value());
    }

    private void assertBalance(String balance) {
        assertThat(accounts.findById(account.getId()).orElseThrow().getBalance()).isEqualByComparingTo(balance);
    }

    private AccountEntity account(String balance) {
        var entity = new AccountEntity(); entity.setUser(user); entity.setDescription("Carteira");
        entity.setType(AccountType.CARTEIRA); entity.setActive(true); entity.setBalance(new BigDecimal(balance));
        return accounts.saveAndFlush(entity);
    }

    private TransactionEntity entry(TransactionType type, String amount, AccountEntity destination) {
        var entry = new TransactionEntity(); entry.setUser(user); entry.setAccount(account); entry.setDescription("Lançamento");
        entry.setAmount(new BigDecimal(amount)); entry.setType(type); entry.setPaymentMethod(PaymentMethod.PIX);
        entry.setOccurredAt(LocalDateTime.now().minusMinutes(1)); entry.setTranscription("Transcrição original");
        entry.setDestinationAccount(destination); return transactions.saveAndFlush(entry);
    }

    private CreditCardPurchaseEntity purchase(String amount, int count) {
        // Simula uma compra registrada antes do fechamento da fatura antiga.
        var oldInvoice = invoice();
        oldInvoice.setStatus(CreditCardInvoiceStatus.OPEN);
        invoices.saveAndFlush(oldInvoice);
        String description = "Compra " + UUID.randomUUID();
        purchaseService.create(new AiAnalysisResponse(description, new BigDecimal(amount), TransactionType.EXPENSE,
                PaymentMethod.CREDIT_CARD, past.atDay(1).atTime(12, 0), null, card.getUuid(), null, null, null, count, List.of()),
                null, null, "Compra no crédito");
        oldInvoice.setStatus(CreditCardInvoiceStatus.CLOSED);
        invoices.saveAndFlush(oldInvoice);
        return purchases.findAll().stream().filter(item -> description.equals(item.getDescription())).findFirst().orElseThrow();
    }

    private CreditCardInvoiceEntity invoice() {
        return invoices.findByCreditCardIdAndReferenceMonth(card.getId(), past.toString()).orElseThrow();
    }

    private CreditCardInvoicePaymentRequest payment() {
        return new CreditCardInvoicePaymentRequest(account.getUuid(), PaymentMethod.PIX, LocalDateTime.now().minusMinutes(1));
    }
}
