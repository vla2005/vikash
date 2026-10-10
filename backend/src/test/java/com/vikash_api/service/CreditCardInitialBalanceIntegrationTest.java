package com.vikash_api.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import com.vikash_api.dtos.requests.*;
import com.vikash_api.dtos.responses.AiAnalysisResponse;
import com.vikash_api.entities.*;
import com.vikash_api.enums.*;
import com.vikash_api.exceptions.*;
import com.vikash_api.repositories.*;
import com.vikash_api.services.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.when;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:initial-card-balances;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000")
class CreditCardInitialBalanceIntegrationTest {
    @Autowired CreditCardService cardService;
    @Autowired CreditCardInvoiceService invoiceService;
    @Autowired CreditCardPurchaseService purchaseService;
    @Autowired CreditCardRepository cards;
    @Autowired CreditCardInvoiceRepository invoices;
    @Autowired CreditCardInstallmentRepository installments;
    @Autowired CreditCardPurchaseRepository purchases;
    @Autowired TransactionRepository transactions;
    @Autowired AccountRepository accounts;
    @Autowired InstitutionRepository institutions;
    @Autowired UserRepository users;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired tools.jackson.databind.ObjectMapper json;
    @MockitoBean AuthenticatedUserService authenticatedUserService;
    CreditCardEntity card;
    UserEntity user;
    TransactionTemplate transaction;
    YearMonth past = YearMonth.now().minusMonths(1);
    YearMonth future = YearMonth.now().plusMonths(1);

    @Test
    void preservesLegacyCardAndItsReservedLimitWhenFinalIsProvided() {
        card.setLastFourDigits(null);
        cards.saveAndFlush(card);
        assertThat(cardService.getByUuid(card.getUuid()).lastFourDigits()).isNull();
        cardService.update(card.getUuid(), new CreditCardRequest(card.getFinancialInstitution().getId(),
                32, card.getCreditLimit(), card.getClosingDay(), card.getDueDay()));
        var updated = cardService.getByUuid(card.getUuid());
        assertThat(updated.lastFourDigits()).isEqualTo(32);
        assertThat(updated.availableLimit()).isEqualByComparingTo("2800");
        assertThat(updated.unallocatedUsedLimit()).isEqualByComparingTo("2200");
    }

    @Test
    void rejectsFractionalCardFinalInsteadOfTruncatingIt() {
        String body = """
                {"financialInstitutionId":1,"lastFourDigits":32.5,"creditLimit":5000,"closingDay":3,"dueDay":10}
                """;
        assertThatThrownBy(() -> json.readValue(body, CreditCardCreateRequest.class))
                .isInstanceOf(tools.jackson.core.JacksonException.class);
        assertThatThrownBy(() -> json.readValue(body, CreditCardRequest.class))
                .isInstanceOf(tools.jackson.core.JacksonException.class);
    }

    @BeforeEach
    void setUp() {
        transaction = new TransactionTemplate(transactionManager);
        user = users.save(UserEntity.builder().name("Teste").email("initial@test.local").password("test-only").build());
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        var bank = new FinancialInstitutionEntity();
        ReflectionTestUtils.setField(bank, "name", "Inter");
        ReflectionTestUtils.setField(bank, "logoUrl", "/images/financial-institutions/inter.webp");
        bank = institutions.save(bank);
        cardService.create(new CreditCardCreateRequest(bank.getId(), 32, new BigDecimal("5000"),
                3, 10, new BigDecimal("2800")));
        card = cards.findByUserIdAndActiveTrue(user.getId()).getFirst();
    }

    @AfterEach
    void cleanUp() {
        transaction.executeWithoutResult(status -> {
            transactions.deleteAll();
            installments.deleteAll();
            purchases.deleteAll();
            invoices.deleteAll();
            accounts.deleteAll();
            cards.deleteAll();
            institutions.deleteAll();
            users.deleteAll();
        });
    }

    CreditCardInitialInvoiceRequest item(YearMonth month, String amount) {
        return new CreditCardInitialInvoiceRequest(month.toString(), new BigDecimal(amount), month.atDay(3), month.atDay(10));
    }

    void distribute(CreditCardInitialInvoiceRequest... items) {
        invoiceService.distributeInitialAmounts(card.getUuid(), new CreditCardInitialInvoicesRequest(List.of(items)));
    }

    CreditCardInvoiceEntity invoice(YearMonth month) {
        return invoices.findByCreditCardIdAndReferenceMonth(card.getId(), month.toString()).orElseThrow();
    }

    AccountEntity account() {
        var account = new AccountEntity();
        account.setUser(user);
        account.setDescription("Carteira");
        account.setType(AccountType.CARTEIRA);
        account.setBalance(new BigDecimal("2000"));
        account.setActive(true);
        return accounts.save(account);
    }

    CreditCardInvoicePaymentRequest payment(AccountEntity account) {
        return new CreditCardInvoicePaymentRequest(account.getUuid(), PaymentMethod.PIX, LocalDateTime.now().minusMinutes(1));
    }

    @Test
    void newCardReservesDebtWithoutInvoicesPurchasesOrCashMovements() {
        var details = cardService.getByUuid(card.getUuid());
        assertThat(details.availableLimit()).isEqualByComparingTo("2800");
        assertThat(details.usedLimit()).isEqualByComparingTo("2200");
        assertThat(details.initialCommittedAmount()).isEqualByComparingTo("2200");
        assertThat(details.unallocatedUsedLimit()).isEqualByComparingTo("2200");
        assertThat(details.invoices()).isEmpty();
        assertThat(transactions.count()).isZero();
        assertThat(purchases.count()).isZero();
    }

    @Test
    void partialDistributionAndRetryPreserveAvailableLimitAndSeparateInitialAmount() {
        distribute(item(past, "800"), item(future, "700"));
        distribute(item(past, "800"), item(future, "700"));
        var details = cardService.getByUuid(card.getUuid());
        assertThat(details.availableLimit()).isEqualByComparingTo("2800");
        assertThat(details.unallocatedUsedLimit()).isEqualByComparingTo("700");
        assertThat(details.allocatedInitialAmount()).isEqualByComparingTo("1500");
        assertThat(details.initialCommittedAmount()).isEqualByComparingTo("2200");
        assertThat(details.invoices()).hasSize(2);
        assertThat(invoice(past).getStatus()).isEqualTo(CreditCardInvoiceStatus.CLOSED);
        assertThat(invoice(future).getStatus()).isEqualTo(CreditCardInvoiceStatus.OPEN);
        var summary = cardService.get().creditCards().getFirst();
        assertThat(summary.availableLimit()).isEqualByComparingTo("2800");
        assertThat(summary.currentInvoice().total()).isEqualByComparingTo("800");
        assertThat(summary.currentInvoice().initialAmount()).isEqualByComparingTo("800");
        assertThat(invoiceService.getByUuid(invoice(past).getUuid()).total()).isEqualByComparingTo("800");
        assertThat(invoiceService.get(card.getUuid()).invoices()).hasSize(2);
        assertThat(invoiceService.get(null).invoices()).allSatisfy(response ->
                assertThat(response.total()).isEqualByComparingTo(response.initialAmount()));
        assertThat(cardService.getInvoiceTransactions(card.getUuid(), invoice(past).getUuid(), 0, 20).getContent()).isEmpty();
    }

    @Test
    void redistributingFullyAllocatedBalanceWorksRegardlessOfOrder() {
        distribute(item(past, "1500"), item(future, "700"));
        // O aumento vem antes da redução: só o saldo final do lote deve ser validado.
        distribute(item(future, "2200"), item(past, "0"));
        assertThat(invoice(future).getInitialAmount()).isEqualByComparingTo("2200");
        assertThat(invoice(past).getInitialAmount()).isEqualByComparingTo("0");
        assertThat(cardService.getByUuid(card.getUuid()).unallocatedUsedLimit()).isEqualByComparingTo("0");
        distribute(item(future, "1000"));
        assertThat(cardService.getByUuid(card.getUuid()).unallocatedUsedLimit()).isEqualByComparingTo("1200");
        assertThat(cardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("2800");
    }

    @Test
    void exceedingCommittedBalanceRollsBackEntireBatch() {
        distribute(item(past, "800"));
        assertThatThrownBy(() -> distribute(item(past, "900"), item(future, "1400")))
                .isInstanceOf(InvalidCreditCardSetupException.class);
        assertThat(invoice(past).getInitialAmount()).isEqualByComparingTo("800");
        assertThat(invoices.count()).isEqualTo(1);
        assertThat(cardService.getByUuid(card.getUuid()).unallocatedUsedLimit()).isEqualByComparingTo("1400");
    }

    @Test
    void rejectsDuplicatesInvalidDatesAndInconsistentExistingDates() {
        assertThatThrownBy(() -> distribute(item(past, "100"), item(past, "200")))
                .isInstanceOf(InvalidCreditCardSetupException.class);
        assertThatThrownBy(() -> distribute(new CreditCardInitialInvoiceRequest(past.toString(), BigDecimal.TEN,
                past.atDay(10), past.atDay(3)))).isInstanceOf(InvalidCreditCardSetupException.class);
        assertThatThrownBy(() -> distribute(new CreditCardInitialInvoiceRequest(future.toString(), BigDecimal.TEN,
                past.atDay(3), past.atDay(10)))).isInstanceOf(InvalidCreditCardSetupException.class);
        assertThat(invoices.count()).isZero();
        distribute(item(past, "800"));
        assertThatThrownBy(() -> distribute(new CreditCardInitialInvoiceRequest(past.toString(), BigDecimal.TEN,
                past.atDay(4), past.atDay(10)))).isInstanceOf(InvalidCreditCardSetupException.class);
        assertThat(invoice(past).getInitialAmount()).isEqualByComparingTo("800");
    }

    @Test
    void rejectsArchivedForeignAndMissingCards() {
        var other = users.save(UserEntity.builder().name("Outro").email("other@test.local").password("test-only").build());
        when(authenticatedUserService.getCurrentUser()).thenReturn(other);
        assertThatThrownBy(() -> distribute(item(past, "100"))).isInstanceOf(CreditCardInvoiceNotFoundException.class);
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        assertThatThrownBy(() -> invoiceService.distributeInitialAmounts(UUID.randomUUID(),
                new CreditCardInitialInvoicesRequest(List.of(item(past, "100")))))
                .isInstanceOf(CreditCardInvoiceNotFoundException.class);
        card.setActive(false);
        cards.save(card);
        assertThatThrownBy(() -> distribute(item(past, "100"))).isInstanceOf(InvalidCreditCardSetupException.class);
        assertThat(invoices.count()).isZero();
    }

    @Test
    void initialAmountDoesNotBecomeCategoryExpenseOrAffectAccountUntilPayment() {
        var account = account();
        distribute(item(past, "800"));
        assertThat(accounts.findById(account.getId()).orElseThrow().getBalance()).isEqualByComparingTo("2000");
        assertThat(transactions.count()).isZero();
        assertThat(installments.sumExpensesByCategory(user.getId(), past.toString())).isEmpty();
        invoiceService.pay(invoice(past).getUuid(), payment(account));
        assertThat(accounts.findById(account.getId()).orElseThrow().getBalance()).isEqualByComparingTo("1200");
        assertThat(transactions.findAll()).singleElement().satisfies(paid -> {
            assertThat(paid.getAmount()).isEqualByComparingTo("800");
            assertThat(paid.getType()).isEqualTo(TransactionType.INVOICE_PAYMENT);
        });
        var details = cardService.getByUuid(card.getUuid());
        assertThat(details.availableLimit()).isEqualByComparingTo("3600");
        assertThat(details.unallocatedUsedLimit()).isEqualByComparingTo("1400");
        assertThat(details.allocatedInitialAmount()).isEqualByComparingTo("800");
        assertThat(details.initialCommittedAmount()).isEqualByComparingTo("2200");
        assertThat(installments.sumExpensesByCategory(user.getId(), past.toString())).isEmpty();
        assertThatThrownBy(() -> distribute(item(past, "100"))).isInstanceOf(InvalidCreditCardSetupException.class);
        assertThatThrownBy(() -> invoiceService.pay(invoice(past).getUuid(), payment(account)))
                .isInstanceOf(InvalidCreditCardInvoiceException.class);
        assertThat(transactions.count()).isEqualTo(1);
    }

    @Test
    void purchasesCoexistWithInitialAmountAndReducingInitialAmountKeepsInstallments() {
        distribute(item(future, "800"));
        var purchaseDate = future.atDay(2).atTime(12, 0);
        purchaseService.create(new AiAnalysisResponse("Compra", new BigDecimal("100"), TransactionType.EXPENSE,
                PaymentMethod.CREDIT_CARD, purchaseDate, null, card.getUuid(), null, null, null, 1, List.of()),
                null, null, "Compra de 100");
        assertThat(cardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("2700");
        assertThat(invoiceService.getByUuid(invoice(future).getUuid()).total()).isEqualByComparingTo("900");
        distribute(item(future, "0"));
        assertThat(invoiceService.getByUuid(invoice(future).getUuid()).total()).isEqualByComparingTo("100");
        assertThat(installments.count()).isEqualTo(1);
        assertThat(cardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("2700");
        assertThat(cardService.getByUuid(card.getUuid()).unallocatedUsedLimit()).isEqualByComparingTo("2200");
    }

    @Test
    void voicePaymentIncludesInitialAmountWhenCheckingSpokenTotal() {
        distribute(item(past, "800"));
        var account = account();
        var invoice = invoice(past);
        assertThatThrownBy(() -> invoiceService.payFromVoice(invoice.getUuid(), card.getUuid(), payment(account),
                new BigDecimal("100"), "Paguei 100 da fatura"))
                .isInstanceOf(InvalidCreditCardInvoiceException.class);
        invoiceService.payFromVoice(invoice.getUuid(), card.getUuid(), payment(account), new BigDecimal("800"),
                "Paguei a fatura de 800");
        assertThat(accounts.findById(account.getId()).orElseThrow().getBalance()).isEqualByComparingTo("1200");
        assertThat(transactions.findAll().getFirst().getTranscription()).isEqualTo("Paguei a fatura de 800");
    }

    @Test
    void paymentOfInvoiceWithPurchasesAndInitialAmountUsesTheirSum() {
        purchaseService.create(new AiAnalysisResponse("Compra antiga", new BigDecimal("100"), TransactionType.EXPENSE,
                PaymentMethod.CREDIT_CARD, past.atDay(2).atTime(12, 0), null, card.getUuid(), null, null, null, 1, List.of()),
                null, null, "Compra de 100");
        distribute(item(past, "800"));
        var account = account();
        invoiceService.pay(invoice(past).getUuid(), payment(account));
        assertThat(transactions.findAll().getFirst().getAmount()).isEqualByComparingTo("900");
        assertThat(accounts.findById(account.getId()).orElseThrow().getBalance()).isEqualByComparingTo("1100");
        assertThat(cardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("3600");
        assertThat(installments.sumExpensesByCategory(user.getId(), past.toString())).singleElement()
                .satisfies(category -> assertThat(category.total()).isEqualByComparingTo("100"));
    }

    @Test
    void concurrentPaymentAndDistributionPreserveRemainingDebtAndReleasedLimit() throws Exception {
        distribute(item(past, "800"));
        var account = account();
        var invoiceUuid = invoice(past).getUuid();
        var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var allocation = pool.submit(() -> {
                start.await();
                distribute(item(future, "700"));
                return true;
            });
            var payment = pool.submit(() -> {
                start.await();
                invoiceService.pay(invoiceUuid, payment(account));
                return true;
            });
            start.countDown();
            assertThat(allocation.get(15, TimeUnit.SECONDS)).isTrue();
            assertThat(payment.get(15, TimeUnit.SECONDS)).isTrue();
        }
        assertThat(cardService.getByUuid(card.getUuid()).unallocatedUsedLimit()).isEqualByComparingTo("700");
        assertThat(cardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("3600");
        assertThat(accounts.findById(account.getId()).orElseThrow().getBalance()).isEqualByComparingTo("1200");
        assertThat(transactions.count()).isEqualTo(1);
    }

    @Test
    void concurrentDistributionsCannotReserveMoreThanTheInitialDebt() throws Exception {
        var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> tryDistribution(start, past));
            var second = pool.submit(() -> tryDistribution(start, future));
            start.countDown();
            assertThat(List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(true, false);
        }
        assertThat(invoices.count()).isEqualTo(1);
        assertThat(cardService.getByUuid(card.getUuid()).unallocatedUsedLimit()).isEqualByComparingTo("700");
        assertThat(cardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("2800");
    }

    boolean tryDistribution(CountDownLatch start, YearMonth month) throws InterruptedException {
        start.await();
        try {
            distribute(item(month, "1500"));
            return true;
        } catch (InvalidCreditCardSetupException exception) {
            return false;
        }
    }
}
