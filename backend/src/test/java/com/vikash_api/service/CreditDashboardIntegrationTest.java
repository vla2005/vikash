package com.vikash_api.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.dtos.responses.CreditDashboardResponse;
import com.vikash_api.entities.*;
import com.vikash_api.enums.CreditCardInvoiceStatus;
import com.vikash_api.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties =
        "spring.datasource.url=${credit.dashboard.test.url:jdbc:h2:mem:credit-dashboard;DB_CLOSE_DELAY=-1}")
class CreditDashboardIntegrationTest {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired CreditCardRepository cards;
    @Autowired CreditCardPurchaseRepository purchases;
    @Autowired CreditCardInvoiceRepository invoices;
    @Autowired CreditCardInstallmentRepository installments;
    @Autowired InstitutionRepository institutions;
    @Autowired DefaultCategoryRepository defaults;
    @Autowired CustomCategoryRepository customs;

    RestClient client;
    AuthResponse auth;
    UserEntity user;
    CreditCardEntity card;

    @BeforeEach
    void setup() {
        client = RestClient.create("http://localhost:" + port);
        auth = register();
        user = users.findByUuid(auth.getUser().getUuid()).orElseThrow();
        card = card(user);
    }

    @Test
    void separatesFullPurchaseFromInstallmentsAndInitialInvoiceAmount() {
        var purchase = purchase(card, "1200", "2026-01-12T10:00:00", 12);
        var invoice = invoice(card, "2026-01", LocalDate.now().plusDays(2), "80", CreditCardInvoiceStatus.CLOSED);
        installment(purchase, invoice, "100", 1);
        var future = invoice(card, "2026-02", LocalDate.now().plusDays(32), "0", CreditCardInvoiceStatus.OPEN);
        installment(purchase, future, "100", 2);

        var response = get(2026, 1, null);
        assertThat(response.purchasesTotal()).isEqualByComparingTo("1200");
        assertThat(response.purchaseCount()).isEqualTo(1);
        assertThat(response.invoicesTotal()).isEqualByComparingTo("180");
        assertThat(response.expensesPerCategory()).singleElement()
                .satisfies(category -> assertThat(category.total()).isEqualByComparingTo("1200"));
        assertThat(response.recentPurchases()).singleElement()
                .satisfies(recent -> assertThat(recent.installmentCount()).isEqualTo(12));
        assertThat(response.upcomingInvoices()).hasSize(2);
        assertThat(cards.findById(card.getId()).orElseThrow().getUnallocatedUsedLimit()).isEqualByComparingTo("50");
    }

    @Test
    void fillsSixMonthsAcrossYearBoundaryAndRespectsPurchaseDatesAndOwner() {
        purchase(card, "25", "2025-08-01T00:00:00", 1);
        purchase(card, "70", "2025-12-31T23:59:59", 1);
        purchase(card, "40", "2026-01-01T00:00:00", 1);
        purchase(card, "500", "2026-02-01T00:00:00", 1);
        purchase(card, "800", "2025-07-31T23:59:59", 1);
        var other = register();
        var otherUser = users.findByUuid(other.getUser().getUuid()).orElseThrow();
        purchase(card(otherUser), "999", "2026-01-01T00:00:00", 1);

        var response = get(2026, 1, null);
        assertThat(response.monthlyPurchases()).extracting(month -> month.referenceMonth())
                .containsExactly("2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01");
        assertThat(response.monthlyPurchases().get(1).total()).isEqualByComparingTo("0");
        assertThat(response.monthlyPurchases().get(4).total()).isEqualByComparingTo("70");
        assertThat(response.purchasesTotal()).isEqualByComparingTo("40");
        assertThat(response.recentPurchases()).hasSize(5);
        assertThat(response.recentPurchases()).allSatisfy(recent ->
                assertThat(recent.creditCard().uuid()).isEqualTo(card.getUuid()));
        assertThat(response.recentPurchases().getFirst().occurredAt()).isEqualTo(LocalDateTime.parse("2026-02-01T00:00:00"));
    }

    @Test
    void filtersEveryPartOfDashboardByOwnedCard() {
        var second = card(user);
        var firstPurchase = purchase(card, "30", "2026-01-10T10:00:00", 1);
        var secondPurchase = purchase(second, "70", "2026-01-11T10:00:00", 1);
        installment(firstPurchase, invoice(card, "2026-01", LocalDate.now(), "5", CreditCardInvoiceStatus.OPEN), "30", 1);
        installment(secondPurchase, invoice(second, "2026-01", LocalDate.now(), "10", CreditCardInvoiceStatus.OPEN), "70", 1);
        assertThat(get(2026, 1, null).purchasesTotal()).isEqualByComparingTo("100");

        var response = get(2026, 1, card.getUuid());
        assertThat(response.purchasesTotal()).isEqualByComparingTo("30");
        assertThat(response.invoicesTotal()).isEqualByComparingTo("35");
        assertThat(response.purchaseCount()).isEqualTo(1);
        assertThat(response.recentPurchases()).singleElement()
                .satisfies(recent -> assertThat(recent.creditCard().uuid()).isEqualTo(card.getUuid()));
        assertThat(response.upcomingInvoices()).singleElement()
                .satisfies(next -> assertThat(next.creditCard().uuid()).isEqualTo(card.getUuid()));
        assertThat(response.expensesPerCategory()).singleElement()
                .satisfies(category -> assertThat(category.total()).isEqualByComparingTo("30"));
    }

    @Test
    void pendingInvoicesIgnoreHistoricalPeriodExcludePaidAndZeroAndKeepInitialAmountOnce() {
        var purchase = purchase(card, "300", "2026-01-01T12:00:00", 3);
        var overdue = invoice(card, "2026-03", LocalDate.now().minusDays(2), "100", CreditCardInvoiceStatus.CLOSED);
        installment(purchase, overdue, "50", 1);
        installment(purchase, overdue, "75", 2);
        invoice(card, "2026-04", LocalDate.now().minusDays(1), "900", CreditCardInvoiceStatus.PAID);
        invoice(card, "2026-05", LocalDate.now().plusDays(1), "0", CreditCardInvoiceStatus.OPEN);
        for (int month = 6; month <= 12; month++) {
            invoice(card, String.format("2026-%02d", month), LocalDate.now().plusDays(month), "20", CreditCardInvoiceStatus.OPEN);
        }
        var response = get(2020, 1, null);
        assertThat(response.purchasesTotal()).isEqualByComparingTo("0");
        assertThat(response.invoicesTotal()).isEqualByComparingTo("0");
        assertThat(response.upcomingInvoices()).hasSize(6);
        assertThat(response.upcomingInvoices().get(0).total()).isEqualByComparingTo("225");
        assertThat(response.upcomingInvoices().get(0).dueDate()).isBefore(LocalDate.now());
        assertThat(response.upcomingInvoices()).noneMatch(next -> next.status() == CreditCardInvoiceStatus.PAID);
    }

    @Test
    void categoriesKeepDefaultCustomAndUncategorizedSeparateEvenWithSameName() {
        DefaultCategoriesEntity standard = new DefaultCategoriesEntity();
        ReflectionTestUtils.setField(standard, "name", "Mercado");
        ReflectionTestUtils.setField(standard, "icon", "basket");
        ReflectionTestUtils.setField(standard, "color", "ochre");
        defaults.save(standard);
        CustomCategoryEntity custom = new CustomCategoryEntity();
        custom.setUser(user); custom.setName("Mercado"); custom.setIcon("basket"); custom.setColor("sage");
        customs.save(custom);
        var first = purchase(card, "10", "2026-01-01T12:00:00", 1);
        first.setDefaultCategory(standard); purchases.save(first);
        var second = purchase(card, "20", "2026-01-02T12:00:00", 1);
        second.setCustomCategory(custom); purchases.save(second);
        purchase(card, "30", "2026-01-03T12:00:00", 1);
        var response = get(2026, 1, null);
        assertThat(response.expensesPerCategory()).hasSize(3);
        assertThat(response.expensesPerCategory().get(0).name()).isEqualTo("Sem categoria");
        assertThat(response.expensesPerCategory().get(1).customCategoryUuid()).isEqualTo(custom.getUuid());
        assertThat(response.expensesPerCategory().get(2).defaultCategoryId()).isEqualTo(standard.getId());
    }

    @Test
    void recentPurchasesAreLimitedToFiveAndOrderedByDateThenIdWithoutRepeatingInstallments() {
        CreditCardPurchaseEntity last = null;
        for (int index = 0; index < 7; index++) {
            last = purchase(card, "10", "2026-01-10T12:00:00", 3);
        }
        var response = get(2020, 1, null);
        assertThat(response.recentPurchases()).hasSize(5);
        assertThat(response.recentPurchases().get(0).uuid()).isEqualTo(last.getUuid());
        assertThat(response.recentPurchases()).extracting(purchase -> purchase.uuid()).doesNotHaveDuplicates();
        assertThat(response.purchaseCount()).isZero();
    }

    @Test
    void requiresAuthenticationValidPeriodAndOwnedCard() {
        assertThat(status("/api/dashboard/credit?year=2026&month=1", null)).isEqualTo(401);
        assertThat(status("/api/dashboard/credit?year=2026&month=13", auth.getAccessToken())).isEqualTo(400);
        assertThat(status("/api/dashboard/credit?year=1899&month=1", auth.getAccessToken())).isEqualTo(400);
        assertThat(status("/api/dashboard/credit?year=2026&month=1&creditCardUuid=invalid", auth.getAccessToken())).isEqualTo(400);
        var foreignAuth = register();
        var foreignCard = card(users.findByUuid(foreignAuth.getUser().getUuid()).orElseThrow());
        assertThat(status("/api/dashboard/credit?year=2026&month=1&creditCardUuid=" + foreignCard.getUuid(),
                auth.getAccessToken())).isEqualTo(404);
        assertThat(status("/api/dashboard/credit?year=2026&month=1&creditCardUuid=" + UUID.randomUUID(),
                auth.getAccessToken())).isEqualTo(404);
    }

    private AuthResponse register() {
        return client.post().uri("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", "Teste", "email", UUID.randomUUID() + "@credit-dashboard.test", "password", "Password123!"))
                .retrieve().body(AuthResponse.class);
    }

    private CreditDashboardResponse get(int year, int month, UUID cardUuid) {
        String path = "/api/dashboard/credit?year=" + year + "&month=" + month;
        if (cardUuid != null) { path += "&creditCardUuid=" + cardUuid; }
        return client.get().uri(path).header("Authorization", "Bearer " + auth.getAccessToken())
                .retrieve().body(CreditDashboardResponse.class);
    }

    private int status(String path, String token) {
        var request = client.get().uri(path);
        if (token != null) { request.header("Authorization", "Bearer " + token); }
        return request.exchange((req, response) -> response.getStatusCode().value());
    }

    private CreditCardEntity card(UserEntity owner) {
        var institution = new FinancialInstitutionEntity();
        ReflectionTestUtils.setField(institution, "name", "Itaú");
        ReflectionTestUtils.setField(institution, "logoUrl", "/images/financial-institutions/itau.webp");
        institutions.save(institution);
        var result = new CreditCardEntity();
        result.setUser(owner); result.setFinancialInstitution(institution); result.setDescription("Meu cartão");
        result.setCreditLimit(new BigDecimal("5000")); result.setUnallocatedUsedLimit(new BigDecimal("50"));
        result.setClosingDay(3); result.setDueDay(10); result.setActive(true);
        return cards.save(result);
    }

    private CreditCardPurchaseEntity purchase(CreditCardEntity ownerCard, String amount, String date, int count) {
        var result = new CreditCardPurchaseEntity();
        result.setCreditCard(ownerCard); result.setDescription("Compra"); result.setAmount(new BigDecimal(amount));
        result.setOccurredAt(LocalDateTime.parse(date)); result.setInstallmentCount(count); result.setTranscription("");
        return purchases.save(result);
    }

    private CreditCardInvoiceEntity invoice(CreditCardEntity ownerCard, String month, LocalDate due, String initial,
            CreditCardInvoiceStatus status) {
        var result = new CreditCardInvoiceEntity();
        result.setCreditCard(ownerCard); result.setReferenceMonth(month);
        result.setDueDate(due); result.setClosingDate(due.minusDays(5)); result.setStatus(status);
        result.setInitialAmount(new BigDecimal(initial));
        return invoices.save(result);
    }

    private void installment(CreditCardPurchaseEntity purchase, CreditCardInvoiceEntity invoice, String amount, int number) {
        var result = new CreditCardInstallmentEntity();
        result.setPurchase(purchase); result.setCreditCardInvoice(invoice);
        result.setAmount(new BigDecimal(amount)); result.setInstallmentNumber(number);
        installments.save(result);
    }
}
