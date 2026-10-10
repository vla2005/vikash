package com.vikash_api.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import com.vikash_api.dtos.requests.*;
import com.vikash_api.dtos.responses.*;
import com.vikash_api.entities.*;
import com.vikash_api.enums.*;
import com.vikash_api.repositories.*;
import com.vikash_api.services.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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
        "spring.datasource.url=${edit.test.datasource.url:jdbc:h2:mem:entry-edit;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000}")
class EntryEditingIntegrationTest {
    @LocalServerPort int port;
    @Autowired TransactionEditService edits;
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
    @Autowired DefaultCategoryRepository defaults;
    @Autowired CustomCategoryRepository customs;
    @Autowired UserRepository users;
    @MockitoBean AuthenticatedUserService authenticatedUserService;
    RestClient client;
    AuthResponse auth;
    UserEntity user;
    AccountEntity account;
    CreditCardEntity card;
    LocalDateTime occurredAt = LocalDateTime.now().minusMinutes(1);

    @BeforeEach
    void setup() {
        client = RestClient.create("http://localhost:" + port);
        auth = client.post().uri("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", "Teste", "email", UUID.randomUUID() + "@editing.test", "password", "Password123!"))
                .retrieve().body(AuthResponse.class);
        user = users.findByUuid(auth.getUser().getUuid()).orElseThrow();
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        when(authenticatedUserService.getCurrentUserId()).thenReturn(user.getId());
        account = account("2000"); card = card(3);
    }

    @Test
    void changesExpenseAccountAndAmountOnlyOnceAndPreservesOriginalDateAndTranscription() {
        var entry = entry(TransactionType.EXPENSE, "50", null);
        balance(account, "1950"); var next = account("500");
        var request = request("75", PaymentMethod.DEBIT_CARD, next.getUuid(), null, null);
        assertThat(update(false, entry.getUuid(), request)).isEqualTo(200);
        assertBalance(account, "2000"); assertBalance(next, "425");
        assertThat(update(false, entry.getUuid(), request)).isEqualTo(200);
        assertBalance(account, "2000"); assertBalance(next, "425");
        var changed = transactions.findById(entry.getId()).orElseThrow();
        assertThat(changed.getDescription()).isEqualTo("Editado");
        assertThat(changed.getPaymentMethod()).isEqualTo(PaymentMethod.DEBIT_CARD);
        assertThat(changed.getOccurredAt()).isEqualToIgnoringNanos(occurredAt);
        assertThat(changed.getTranscription()).isEqualTo("Transcrição original");
    }

    @Test
    void changingIncomeReversesOldIncomeBeforeCreditingNewAccount() {
        var entry = entry(TransactionType.INCOME, "100", null); balance(account, "2100");
        var next = account("500");
        assertThat(update(false, entry.getUuid(), request("80", PaymentMethod.PIX, next.getUuid(), null, null))).isEqualTo(200);
        assertBalance(account, "2000"); assertBalance(next, "580");
    }

    @Test
    void editingTransferReversesBothOldAccountsAndUpdatesBothNewAccounts() {
        var oldDestination = account("550"); var nextOrigin = account("600"); var nextDestination = account("700");
        var entry = entry(TransactionType.TRANSFER, "50", oldDestination); balance(account, "1950");
        assertThat(update(false, entry.getUuid(), request("80", PaymentMethod.PIX, nextOrigin.getUuid(), null, nextDestination.getUuid()))).isEqualTo(200);
        assertBalance(account, "2000"); assertBalance(oldDestination, "500");
        assertBalance(nextOrigin, "520"); assertBalance(nextDestination, "780");
    }

    @Test
    void repricesExistingInstallmentsIncludingClosedInvoicesWithoutLosingCentsOrInitialDebt() {
        var purchase = purchase("100", 3);
        var before = installments.findByPurchaseId(purchase.getId());
        var first = invoices.findById(before.getFirst().getCreditCardInvoice().getId()).orElseThrow();
        first.setStatus(CreditCardInvoiceStatus.CLOSED); first.setInitialAmount(new BigDecimal("20")); invoices.saveAndFlush(first);
        assertThat(update(true, purchase.getUuid(), request("70.01", PaymentMethod.CREDIT_CARD, null, card.getUuid(), null))).isEqualTo(200);
        var after = installments.findByPurchaseId(purchase.getId());
        assertThat(after).extracting(CreditCardInstallmentEntity::getUuid).containsExactlyInAnyOrderElementsOf(before.stream().map(CreditCardInstallmentEntity::getUuid).toList());
        assertThat(after.stream().map(CreditCardInstallmentEntity::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add)).isEqualByComparingTo("70.01");
        assertThat(after).extracting(item -> item.getAmount().toPlainString()).containsExactlyInAnyOrder("23.33", "23.34", "23.34");
        assertThat(invoices.findById(first.getId()).orElseThrow().getInitialAmount()).isEqualByComparingTo("20");
        assertBalance(account, "2000");
        assertThat(cardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("4409.99");
    }

    @Test
    void movingPurchaseReleasesOldLimitAndRebuildsInvoicesOnNewCard() {
        var purchase = purchase("300", 3); var nextCard = card(5);
        assertThat(update(true, purchase.getUuid(), request("240", PaymentMethod.CREDIT_CARD, null, nextCard.getUuid(), null))).isEqualTo(200);
        assertThat(cardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("4500");
        assertThat(cardService.getByUuid(nextCard.getUuid()).availableLimit()).isEqualByComparingTo("4260");
        var after = installments.findByPurchaseId(purchase.getId());
        assertThat(after).hasSize(3).allSatisfy(item -> {
            assertThat(item.getCreditCardInvoice().getCreditCard().getId()).isEqualTo(nextCard.getId());
            assertThat(item.getAmount()).isEqualByComparingTo("80");
            assertThat(item.getCreditCardInvoice().getClosingDate().getDayOfMonth()).isEqualTo(5);
        });
    }

    @Test
    void convertsExpenseToCreditAndBackWithoutDuplicatingTheEntry() {
        var entry = entry(TransactionType.EXPENSE, "50", null); balance(account, "1950");
        assertThat(update(false, entry.getUuid(), request("60", PaymentMethod.CREDIT_CARD, null, card.getUuid(), null))).isEqualTo(200);
        assertBalance(account, "2000"); assertThat(transactions.findByUuidAndUserId(entry.getUuid(), user.getId())).isEmpty();
        var purchase = purchases.findByUuidAndCreditCardUserId(entry.getUuid(), user.getId()).orElseThrow();
        assertThat(purchase.getInstallmentCount()).isEqualTo(1);
        assertThat(cardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("4440");
        assertThat(update(true, purchase.getUuid(), request("70", PaymentMethod.PIX, account.getUuid(), null, null))).isEqualTo(200);
        assertBalance(account, "1930"); assertThat(purchases.findByUuidAndCreditCardUserId(entry.getUuid(), user.getId())).isEmpty();
        assertThat(installments.findByPurchaseId(purchase.getId())).isEmpty();
        assertThat(transactions.findByUuidAndUserId(entry.getUuid(), user.getId())).isPresent();
        assertThat(cardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("4500");
    }

    @Test
    void paidInstallmentsBlockFinancialChangesButAllowDescriptionAndCategory() {
        var purchase = purchase("300", 3);
        var first = installments.findByPurchaseId(purchase.getId()).getFirst().getCreditCardInvoice();
        first.setStatus(CreditCardInvoiceStatus.PAID); invoices.saveAndFlush(first);
        var nextCard = card(5);
        for (var request : List.of(request("330", PaymentMethod.CREDIT_CARD, null, card.getUuid(), null),
                request("300", PaymentMethod.CREDIT_CARD, null, nextCard.getUuid(), null),
                request("300", PaymentMethod.PIX, account.getUuid(), null, null))) {
            assertThat(update(true, purchase.getUuid(), request)).isEqualTo(400);
        }
        var category = category();
        var metadata = new TransactionUpdateRequest("Descrição corrigida", new BigDecimal("300"), PaymentMethod.CREDIT_CARD,
                null, card.getUuid(), null, null, category.getUuid());
        assertThat(update(true, purchase.getUuid(), metadata)).isEqualTo(200);
        assertThat(purchaseService.getByUuid(purchase.getUuid()).category().uuid()).isEqualTo(category.getUuid());
        assertThat(purchaseService.getByUuid(purchase.getUuid()).description()).isEqualTo("Descrição corrigida");
        assertThat(installments.findByPurchaseId(purchase.getId())).hasSize(3);
        assertBalance(account, "2000");
    }

    @Test
    void changesAndClearsCategoryWithoutAffectingBalance() {
        var entry = entry(TransactionType.EXPENSE, "50", null); var category = category(); balance(account, "1950");
        var request = new TransactionUpdateRequest("Editado", new BigDecimal("50"), PaymentMethod.PIX, account.getUuid(), null, null, null, category.getUuid());
        assertThat(update(false, entry.getUuid(), request)).isEqualTo(200);
        assertThat(transactionService.getByUuid(entry.getUuid()).category().uuid()).isEqualTo(category.getUuid());
        assertThat(update(false, entry.getUuid(), request("50", PaymentMethod.PIX, account.getUuid(), null, null))).isEqualTo(200);
        assertThat(transactions.findById(entry.getId()).orElseThrow().getCustomCategory()).isNull(); assertBalance(account, "1950");
    }

    @Test
    void failedConversionToPaidTargetInvoiceRollsBackRefundAndAllChanges() {
        var purchase = purchase("100", 1);
        var first = installments.findByPurchaseId(purchase.getId()).getFirst().getCreditCardInvoice();
        first.setStatus(CreditCardInvoiceStatus.PAID); invoices.saveAndFlush(first);
        var entry = entry(TransactionType.EXPENSE, "50", null); balance(account, "1950");
        assertThat(update(false, entry.getUuid(), request("60", PaymentMethod.CREDIT_CARD, null, card.getUuid(), null))).isEqualTo(400);
        assertBalance(account, "1950"); assertThat(transactions.findById(entry.getId())).isPresent();
        assertThat(purchases.findByUuidAndCreditCardUserId(entry.getUuid(), user.getId())).isEmpty();
    }

    @Test
    void invoicePaymentCanChangeAccountButKeepsInvoiceTotalAndPaidStatus() {
        var purchase = purchase("100", 1);
        var first = installments.findByPurchaseId(purchase.getId()).getFirst().getCreditCardInvoice();
        first.setClosingDate(occurredAt.toLocalDate().minusDays(1)); first.setStatus(CreditCardInvoiceStatus.CLOSED); invoices.saveAndFlush(first);
        invoiceService.pay(first.getUuid(), new CreditCardInvoicePaymentRequest(account.getUuid(), PaymentMethod.PIX, occurredAt));
        var payment = transactions.findSummariesByUserId(user.getId(), org.springframework.data.domain.PageRequest.of(0, 20)).getContent().getFirst();
        var next = account("500");
        assertThat(update(false, payment.uuid(), request("100", PaymentMethod.DEBIT_CARD, next.getUuid(), null, null))).isEqualTo(200);
        assertBalance(account, "2000"); assertBalance(next, "400");
        assertThat(invoices.findById(first.getId()).orElseThrow().getStatus()).isEqualTo(CreditCardInvoiceStatus.PAID);
        assertThat(update(false, payment.uuid(), request("99", PaymentMethod.PIX, next.getUuid(), null, null))).isEqualTo(400);
        assertBalance(next, "400");
        balance(next, "-10");
        assertThat(update(false, payment.uuid(), request("100", PaymentMethod.PIX, next.getUuid(), null, null))).isEqualTo(200);
        assertBalance(next, "-10");
        var insufficient = account("50");
        assertThat(update(false, payment.uuid(), request("100", PaymentMethod.PIX, insufficient.getUuid(), null, null))).isEqualTo(400);
        assertBalance(next, "-10"); assertBalance(insufficient, "50");
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "1.001", "10000000000000"})
    void invalidAmountsReturnFieldErrorsWithoutChangingBalance(String amount) {
        var entry = entry(TransactionType.EXPENSE, "50", null); balance(account, "1950");
        for (var path : List.of("transaction", "credit-card-purchase")) {
            var response = client.put().uri("/api/" + path + "/" + entry.getUuid()).header("Authorization", "Bearer " + auth.getAccessToken())
                    .contentType(MediaType.APPLICATION_JSON).body(request(amount, PaymentMethod.PIX, account.getUuid(), null, null))
                    .exchange((request, result) -> { assertThat(result.getStatusCode().value()).isEqualTo(400); return result.bodyTo(ErrorResponse.class); });
            assertThat(response.getFieldErrors()).containsKey("amount");
        }
        assertBalance(account, "1950");
    }

    @Test
    void ownershipAndPaymentValidationPreventChangesAndRequireAuthentication() {
        var entry = entry(TransactionType.INCOME, "50", null); var purchase = purchase("100", 1);
        assertThat(update(false, entry.getUuid(), request("50", PaymentMethod.CREDIT_CARD, null, card.getUuid(), null))).isEqualTo(400);
        var other = users.save(UserEntity.builder().name("Outro").email(UUID.randomUUID() + "@editing.test").password("test-only").build());
        when(authenticatedUserService.getCurrentUser()).thenReturn(other);
        assertThat(update(false, entry.getUuid(), request("50", PaymentMethod.PIX, account.getUuid(), null, null))).isEqualTo(404);
        assertThat(update(true, purchase.getUuid(), request("100", PaymentMethod.CREDIT_CARD, null, card.getUuid(), null))).isEqualTo(404);
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        var foreignAccount = account("500"); foreignAccount.setUser(other); accounts.saveAndFlush(foreignAccount);
        assertThat(update(false, entry.getUuid(), request("60", PaymentMethod.PIX, foreignAccount.getUuid(), null, null))).isEqualTo(400);
        var foreignCategory = category(); foreignCategory.setUser(other); customs.saveAndFlush(foreignCategory);
        assertThat(update(false, entry.getUuid(), new TransactionUpdateRequest("Editado", new BigDecimal("50"), PaymentMethod.PIX,
                account.getUuid(), null, null, null, foreignCategory.getUuid()))).isEqualTo(400);
        for (var path : List.of("transaction", "credit-card-purchase")) {
            int status = client.put().uri("/api/" + path + "/" + entry.getUuid()).contentType(MediaType.APPLICATION_JSON)
                    .body(request("50", PaymentMethod.PIX, account.getUuid(), null, null))
                    .exchange((request, result) -> result.getStatusCode().value());
            assertThat(status).isEqualTo(401);
        }
        assertBalance(account, "2000");
    }

    @Test
    void simultaneousEditsDoNotApplyBalanceDifferenceTwice() throws Exception {
        var entry = entry(TransactionType.EXPENSE, "50", null); balance(account, "1950");
        var request = request("60", PaymentMethod.PIX, account.getUuid(), null, null); var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> { start.await(); return update(false, entry.getUuid(), request); });
            var second = executor.submit(() -> { start.await(); return update(false, entry.getUuid(), request); });
            start.countDown(); assertThat(first.get(15, TimeUnit.SECONDS)).isEqualTo(200); assertThat(second.get(15, TimeUnit.SECONDS)).isEqualTo(200);
        }
        assertBalance(account, "1940");
    }

    private TransactionUpdateRequest request(String amount, PaymentMethod method, UUID account, UUID card, UUID destination) {
        return new TransactionUpdateRequest("Editado", new BigDecimal(amount), method, account, card, destination, null, null);
    }
    private int update(boolean purchase, UUID uuid, TransactionUpdateRequest body) {
        return client.put().uri("/api/" + (purchase ? "credit-card-purchase" : "transaction") + "/" + uuid)
                .header("Authorization", "Bearer " + auth.getAccessToken()).contentType(MediaType.APPLICATION_JSON).body(body)
                .exchange((request, result) -> result.getStatusCode().value());
    }
    private AccountEntity account(String balance) {
        var entity = new AccountEntity(); entity.setUser(user); entity.setDescription("Carteira");
        entity.setType(AccountType.CARTEIRA); entity.setActive(true); entity.setBalance(new BigDecimal(balance)); return accounts.saveAndFlush(entity);
    }
    private CreditCardEntity card(int closingDay) {
        var institution = new FinancialInstitutionEntity(); ReflectionTestUtils.setField(institution, "name", "Banco " + UUID.randomUUID());
        ReflectionTestUtils.setField(institution, "logoUrl", "/images/financial-institutions/inter.webp"); institution = institutions.save(institution);
        cardService.create(new CreditCardCreateRequest(institution.getId(), "Cartão", new BigDecimal("5000"), closingDay, 10, new BigDecimal("4500")));
        Long institutionId = institution.getId();
        return cards.findByUserIdAndActiveTrue(user.getId()).stream().filter(item -> item.getFinancialInstitution().getId().equals(institutionId)).findFirst().orElseThrow();
    }
    private TransactionEntity entry(TransactionType type, String amount, AccountEntity destination) {
        var entry = new TransactionEntity(); entry.setUser(user); entry.setAccount(account); entry.setDescription("Original");
        entry.setAmount(new BigDecimal(amount)); entry.setType(type); entry.setPaymentMethod(PaymentMethod.PIX);
        entry.setOccurredAt(occurredAt); entry.setTranscription("Transcrição original"); entry.setDestinationAccount(destination); return transactions.saveAndFlush(entry);
    }
    private CreditCardPurchaseEntity purchase(String amount, int count) {
        String description = "Compra " + UUID.randomUUID();
        purchaseService.create(new AiAnalysisResponse(description, new BigDecimal(amount), TransactionType.EXPENSE, PaymentMethod.CREDIT_CARD,
                occurredAt, null, card.getUuid(), null, null, null, count, List.of()), null, null, "Transcrição original");
        return purchases.findAll().stream().filter(item -> description.equals(item.getDescription())).findFirst().orElseThrow();
    }
    private CustomCategoryEntity category() {
        var category = new CustomCategoryEntity(); category.setUser(user); category.setName("Categoria " + UUID.randomUUID());
        category.setIcon("health"); category.setColor("sage"); return customs.saveAndFlush(category);
    }
    private void balance(AccountEntity account, String value) { account.setBalance(new BigDecimal(value)); accounts.saveAndFlush(account); }
    private void assertBalance(AccountEntity account, String value) { assertThat(accounts.findById(account.getId()).orElseThrow().getBalance()).isEqualByComparingTo(value); }
}
