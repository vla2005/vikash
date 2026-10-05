package com.vikash_api.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import com.vikash_api.dtos.requests.AiAnalysisContext;
import com.vikash_api.dtos.requests.TransactionRequest;
import com.vikash_api.dtos.responses.AiAnalysisResponse;
import com.vikash_api.entities.CreditCardEntity;
import com.vikash_api.entities.FinancialInstitutionEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.enums.TransactionType;
import com.vikash_api.exceptions.CreditCardInvoiceNotFoundException;
import com.vikash_api.exceptions.InvalidTransactionException;
import com.vikash_api.repositories.CreditCardInvoiceRepository;
import com.vikash_api.repositories.CreditCardRepository;
import com.vikash_api.repositories.InstitutionRepository;
import com.vikash_api.repositories.TransactionRepository;
import com.vikash_api.repositories.UserRepository;
import com.vikash_api.services.AiAnalysisService;
import com.vikash_api.services.AuthenticatedUserService;
import com.vikash_api.services.TransactionService;
import com.vikash_api.services.CreditCardService;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:voice-invoices;DB_CLOSE_DELAY=-1")
@Transactional
class VoiceCreditCardIntegrationTest {
    @Autowired TransactionService transactionService;
    @Autowired CreditCardService creditCardService;
    @Autowired UserRepository userRepository;
    @Autowired InstitutionRepository institutionRepository;
    @Autowired CreditCardRepository creditCardRepository;
    @Autowired CreditCardInvoiceRepository invoiceRepository;
    @Autowired TransactionRepository transactionRepository;
    @Autowired com.vikash_api.repositories.AccountRepository accountRepository;
    @Autowired com.vikash_api.services.CreditCardInvoiceService invoiceService;
    @Autowired com.vikash_api.repositories.CreditCardPurchaseRepository purchaseRepository;
    @Autowired com.vikash_api.repositories.CreditCardInstallmentRepository installmentRepository;
    @MockitoBean AuthenticatedUserService authenticatedUserService;
    @MockitoBean AiAnalysisService aiAnalysisService;
    CreditCardEntity card;

    @BeforeEach
    void setup() {
        var user = userRepository.save(UserEntity.builder().name("Teste").email("voice@test.local").password("test-only").build());
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        var bank = new FinancialInstitutionEntity();
        ReflectionTestUtils.setField(bank, "name", "Inter");
        ReflectionTestUtils.setField(bank, "logoUrl", "/images/financial-institutions/inter.webp");
        bank = institutionRepository.save(bank);
        card = new CreditCardEntity();
        card.setUser(user);
        card.setDescription("Meu cartão Inter");
        card.setFinancialInstitution(bank);
        card.setCreditLimit(new BigDecimal("5000"));
        card.setClosingDay(3);
        card.setDueDay(10);
        card = creditCardRepository.saveAndFlush(card);
    }

    AiAnalysisResponse analysis(UUID cardUuid, List<String> missingFields) {
        return new AiAnalysisResponse("Compra no crédito", new BigDecimal("100.00"), TransactionType.EXPENSE,
                PaymentMethod.CREDIT_CARD, LocalDateTime.of(2026, 10, 4, 12, 0), null, cardUuid, null, null, null, 1, missingFields);
    }

    private com.vikash_api.entities.AccountEntity paymentAccount(String balance) {
        var account = new com.vikash_api.entities.AccountEntity();
        account.setUser(card.getUser());
        account.setDescription("Minha carteira");
        account.setType(com.vikash_api.enums.AccountType.CARTEIRA);
        account.setBalance(new BigDecimal(balance));
        account.setActive(true);
        return accountRepository.saveAndFlush(account);
    }

    private UUID payableInvoice() {
        when(aiAnalysisService.analyze(any(), any())).thenReturn(new AiAnalysisResponse(
                "Notebook", new BigDecimal("1500.00"), TransactionType.EXPENSE, PaymentMethod.CREDIT_CARD,
                LocalDateTime.of(2026, 10, 2, 12, 0), null, card.getUuid(), null, null, null, 3, List.of()));
        return transactionService.create(new TransactionRequest("Notebook de 1500 em 3x")).creditCardInvoiceUuid();
    }

    private com.vikash_api.dtos.requests.CreditCardInvoicePaymentRequest paymentRequest(UUID accountUuid) {
        return new com.vikash_api.dtos.requests.CreditCardInvoicePaymentRequest(accountUuid, PaymentMethod.PIX, LocalDateTime.now().minusSeconds(1));
    }

    @Test
    void voicePaysIdentifiedInvoiceUsingAccountAndSpokenDate() {
        var account = paymentAccount("2000");
        var invoiceUuid = payableInvoice();
        var date = LocalDateTime.of(2026, 10, 4, 19, 0);
        String transcription = "Paguei a fatura de outubro do cartão Inter com minha carteira ontem às 19h";
        when(aiAnalysisService.analyze(eq(transcription), any())).thenAnswer(call -> {
            AiAnalysisContext context = call.getArgument(1);
            assertThat(context.creditCardInvoices()).anySatisfy(invoice -> {
                assertThat(invoice.uuid()).isEqualTo(invoiceUuid);
                assertThat(invoice.creditCardUuid()).isEqualTo(card.getUuid());
                assertThat(invoice.referenceMonth()).isEqualTo("2026-10");
            });
            return new AiAnalysisResponse(null, null, TransactionType.INVOICE_PAYMENT, PaymentMethod.OTHER,
                    date, account.getUuid(), card.getUuid(), null, null, null, 1, List.of(), invoiceUuid);
        });
        var response = transactionService.create(new TransactionRequest(transcription));
        assertThat(response.type()).isEqualTo(TransactionType.INVOICE_PAYMENT);
        assertThat(response.occurredAt()).isEqualTo(date);
        assertThat(response.amount()).isEqualByComparingTo("500");
        assertThat(response.accountUuid()).isEqualTo(account.getUuid());
        assertThat(response.creditCardInvoiceUuid()).isEqualTo(invoiceUuid);
        assertThat(response.transcription()).isEqualTo(transcription);
        assertThat(account.getBalance()).isEqualByComparingTo("1500");
        assertThat(transactionRepository.count()).isEqualTo(1);
        assertThat(purchaseRepository.count()).isEqualTo(1);
        assertThat(creditCardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("4000");
        assertThatThrownBy(() -> transactionService.create(new TransactionRequest(transcription)))
                .isInstanceOf(com.vikash_api.exceptions.InvalidCreditCardInvoiceException.class).hasMessageContaining("já foi paga");
        assertThat(transactionRepository.count()).isEqualTo(1);
    }

    @Test
    void voiceCannotPayWrongCardInvoiceOrDifferentAmount() {
        var account = paymentAccount("2000");
        var invoiceUuid = payableInvoice();
        var date = LocalDateTime.of(2026, 10, 4, 19, 0);
        when(aiAnalysisService.analyze(any(), any())).thenReturn(new AiAnalysisResponse(null, null,
                TransactionType.INVOICE_PAYMENT, PaymentMethod.PIX, date, account.getUuid(), UUID.randomUUID(),
                null, null, null, 1, List.of(), invoiceUuid));
        assertThatThrownBy(() -> transactionService.create(new TransactionRequest("Paguei a fatura")))
                .isInstanceOf(com.vikash_api.exceptions.InvalidCreditCardInvoiceException.class).hasMessageContaining("não pertence");
        when(aiAnalysisService.analyze(any(), any())).thenReturn(new AiAnalysisResponse(null, new BigDecimal("100"),
                TransactionType.INVOICE_PAYMENT, PaymentMethod.PIX, date, account.getUuid(), card.getUuid(),
                null, null, null, 1, List.of(), invoiceUuid));
        assertThatThrownBy(() -> transactionService.create(new TransactionRequest("Paguei 100 da fatura")))
                .isInstanceOf(com.vikash_api.exceptions.InvalidCreditCardInvoiceException.class).hasMessageContaining("total da fatura");
        assertThat(account.getBalance()).isEqualByComparingTo("2000");
        assertThat(transactionRepository.count()).isZero();
    }

    @Test
    void payingInvoiceCreatesOnlyOneAccountMovementAndReleasesItsInstallmentLimit() {
        var account = paymentAccount("2000");
        var invoiceUuid = payableInvoice();
        assertThat(transactionRepository.count()).isZero();
        assertThat(purchaseRepository.count()).isEqualTo(1);
        assertThat(installmentRepository.count()).isEqualTo(3);
        assertThat(creditCardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("3500");
        invoiceService.pay(invoiceUuid, paymentRequest(account.getUuid()));
        transactionRepository.flush();
        assertThat(account.getBalance()).isEqualByComparingTo("1500");
        assertThat(creditCardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("4000");
        var rows = transactionService.getSummaries(0, 20).getContent();
        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst().type()).isEqualTo(TransactionType.INVOICE_PAYMENT);
        assertThat(rows.getFirst().amount()).isEqualByComparingTo("500");
        assertThat(rows.getFirst().categoryName()).isNull();
        assertThat(rows.getFirst().institutionName()).isEqualTo("Carteira");
        assertThat(creditCardService.getInvoiceTransactions(card.getUuid(), invoiceUuid, 0, 20)).hasSize(1);
        assertThatThrownBy(() -> invoiceService.pay(invoiceUuid, paymentRequest(account.getUuid())))
                .isInstanceOf(com.vikash_api.exceptions.InvalidCreditCardInvoiceException.class).hasMessageContaining("já foi paga");
        assertThat(account.getBalance()).isEqualByComparingTo("1500");
        assertThat(transactionRepository.count()).isEqualTo(1);
    }

    @Test
    void insufficientBalanceOrForeignAccountDoesNotPayInvoice() {
        var account = paymentAccount("100");
        var invoiceUuid = payableInvoice();
        assertThatThrownBy(() -> invoiceService.pay(invoiceUuid, paymentRequest(account.getUuid())))
                .isInstanceOf(com.vikash_api.exceptions.InvalidCreditCardInvoiceException.class).hasMessageContaining("Saldo insuficiente");
        assertThat(account.getBalance()).isEqualByComparingTo("100");
        account.setBalance(new BigDecimal("2000"));
        var other = userRepository.save(UserEntity.builder().name("Outro").email("pay@test.local").password("test-only").build());
        account.setUser(other);
        accountRepository.flush();
        assertThatThrownBy(() -> invoiceService.pay(invoiceUuid, paymentRequest(account.getUuid())))
                .isInstanceOf(com.vikash_api.exceptions.InvalidCreditCardInvoiceException.class).hasMessageContaining("Conta não encontrada");
        assertThat(invoiceService.getByUuid(invoiceUuid).status()).isEqualTo(com.vikash_api.enums.CreditCardInvoiceStatus.OPEN);
        assertThat(transactionRepository.count()).isZero();
        when(authenticatedUserService.getCurrentUser()).thenReturn(other);
        assertThatThrownBy(() -> invoiceService.pay(invoiceUuid, paymentRequest(account.getUuid())))
                .isInstanceOf(CreditCardInvoiceNotFoundException.class);
    }

    @Test
    void payingWithCreditOrBeforeClosingIsRejected() {
        var account = paymentAccount("2000");
        var invoiceUuid = payableInvoice();
        assertThatThrownBy(() -> invoiceService.pay(invoiceUuid,
                new com.vikash_api.dtos.requests.CreditCardInvoicePaymentRequest(account.getUuid(), PaymentMethod.CREDIT_CARD, LocalDateTime.now())))
                .isInstanceOf(com.vikash_api.exceptions.InvalidCreditCardInvoiceException.class);
        assertThatThrownBy(() -> invoiceService.pay(invoiceUuid,
                new com.vikash_api.dtos.requests.CreditCardInvoicePaymentRequest(account.getUuid(), PaymentMethod.PIX, LocalDateTime.of(2026, 10, 2, 14, 0))))
                .isInstanceOf(com.vikash_api.exceptions.InvalidCreditCardInvoiceException.class).hasMessageContaining("fechamento");
        assertThat(transactionRepository.count()).isZero();
        assertThat(account.getBalance()).isEqualByComparingTo("2000");
    }

    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void simultaneousPaymentsDebitAccountOnlyOnce() throws Exception {
        var account = paymentAccount("2000");
        var invoiceUuid = payableInvoice();
        var request = paymentRequest(account.getUuid());
        var start = new java.util.concurrent.CountDownLatch(1);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<Boolean> pay = () -> {
                start.await();
                try { invoiceService.pay(invoiceUuid, request); return true; }
                catch (com.vikash_api.exceptions.InvalidCreditCardInvoiceException cause) {
                    assertThat(cause).hasMessageContaining("já foi paga");
                    return false;
                }
            };
            var first = executor.submit(pay);
            var second = executor.submit(pay);
            start.countDown();
            assertThat(List.of(first.get(10, java.util.concurrent.TimeUnit.SECONDS),
                    second.get(10, java.util.concurrent.TimeUnit.SECONDS))).containsExactlyInAnyOrder(true, false);
            assertThat(transactionRepository.count()).isEqualTo(1);
            assertThat(accountRepository.findById(account.getId()).orElseThrow().getBalance()).isEqualByComparingTo("1500");
            assertThat(creditCardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("4000");
        } finally {
            transactionRepository.deleteAll();
            installmentRepository.deleteAll();
            purchaseRepository.deleteAll();
            invoiceRepository.deleteAll();
            accountRepository.deleteAll();
            creditCardRepository.deleteAll();
            institutionRepository.deleteAll();
            userRepository.deleteAll();
        }
    }

    @Test
    void voiceCreatesPurchasesAndReusesInvoiceWithoutAddingAccountTransactions() {
        when(aiAnalysisService.analyze(eq("Comprei 100 reais no crédito Inter"), any(AiAnalysisContext.class))).thenAnswer(call -> {
            AiAnalysisContext context = call.getArgument(1);
            assertThat(context.accounts()).isEmpty();
            assertThat(context.creditCards()).hasSize(1);
            assertThat(context.creditCards().getFirst().uuid()).isEqualTo(card.getUuid());
            assertThat(context.creditCards().getFirst().financialInstitution().name()).isEqualTo("Inter");
            return analysis(card.getUuid(), List.of());
        });
        var request = new TransactionRequest("Comprei 100 reais no crédito Inter");
        var first = transactionService.create(request);
        var second = transactionService.create(request);
        assertThat(first.accountUuid()).isNull();
        assertThat(first.creditCardUuid()).isEqualTo(card.getUuid());
        assertThat(first.creditCardInvoiceUuid()).isNotNull().isEqualTo(second.creditCardInvoiceUuid());
        assertThat(invoiceRepository.count()).isEqualTo(1);
        var invoice = invoiceRepository.findAll().getFirst();
        assertThat(invoice.getReferenceMonth()).isEqualTo("2026-11");
        assertThat(invoice.getClosingDate()).isEqualTo(java.time.LocalDate.of(2026, 11, 3));
        assertThat(invoice.getDueDate()).isEqualTo(java.time.LocalDate.of(2026, 11, 10));
        transactionRepository.flush();
        assertThat(transactionService.getSummaries(0, 20).getContent()).isEmpty();
        assertThat(transactionRepository.count()).isZero();
        assertThat(purchaseRepository.count()).isEqualTo(2);
        assertThat(installmentRepository.count()).isEqualTo(2);
        var summary = creditCardService.get().creditCards().getFirst();
        assertThat(summary.currentInvoice().total()).isEqualByComparingTo("200.00");
        assertThat(summary.availableLimit()).isEqualByComparingTo("4800.00");
        assertThat(summary.currentInvoice().uuid()).isEqualTo(invoice.getUuid());
    }

    @Test
    void missingOrUnownedCardNeverCreatesInvoiceOrTransaction() {
        when(aiAnalysisService.analyze(any(), any())).thenReturn(analysis(null, List.of("creditCardUuid")));
        assertThatThrownBy(() -> transactionService.create(new TransactionRequest("Comprei no crédito")))
                .isInstanceOf(InvalidTransactionException.class);
        var foreignUser = userRepository.save(UserEntity.builder().name("Outro usuário").email("other@test.local").password("test-only").build());
        when(authenticatedUserService.getCurrentUser()).thenReturn(foreignUser);
        when(aiAnalysisService.analyze(any(), any())).thenReturn(analysis(card.getUuid(), List.of()));
        assertThatThrownBy(() -> transactionService.create(new TransactionRequest("Comprei no crédito Inter")))
                .isInstanceOf(CreditCardInvoiceNotFoundException.class);
        assertThat(invoiceRepository.count()).isZero();
        assertThat(transactionRepository.count()).isZero();
        assertThat(purchaseRepository.count()).isZero();
        assertThat(installmentRepository.count()).isZero();
        assertThat(creditCardService.get().creditCards()).isEmpty();
    }

    @Test
    void missingInstallmentCountIsRejectedWithoutSavingFullAmountAsSinglePurchase() {
        when(aiAnalysisService.analyze(any(), any())).thenReturn(analysis(card.getUuid(), List.of("installmentCount")));
        assertThatThrownBy(() -> transactionService.create(new TransactionRequest("Comprei em 3 vezes no Inter")))
                .isInstanceOf(InvalidTransactionException.class).hasMessageContaining("quantidade de parcelas");
        assertThat(invoiceRepository.count()).isZero();
        assertThat(transactionRepository.count()).isZero();
        assertThat(purchaseRepository.count()).isZero();
        assertThat(installmentRepository.count()).isZero();
    }

    @Test
    void ambiguousVoiceInvoicePaymentDoesNotCreateExpense() {
        when(aiAnalysisService.analyze(any(), any())).thenReturn(analysis(card.getUuid(), List.of("creditCardInvoiceUuid")));
        assertThatThrownBy(() -> transactionService.create(new TransactionRequest("Paguei a fatura do Inter")))
                .isInstanceOf(InvalidTransactionException.class).hasMessageContaining("mês/ano");
        assertThat(transactionRepository.count()).isZero();
        assertThat(purchaseRepository.count()).isZero();
    }

    @Test
    void purchaseOf1500InThreeInstallmentsUsesThreeInvoicesAndReservesEntireLimit() {
        when(aiAnalysisService.analyze(any(), any())).thenReturn(new AiAnalysisResponse(
                "Notebook", new BigDecimal("1500.00"), TransactionType.EXPENSE, PaymentMethod.CREDIT_CARD,
                LocalDateTime.of(2026, 10, 4, 12, 0), null, card.getUuid(), null, null, null, 3, List.of()));
        var response = transactionService.create(new TransactionRequest("Comprei um notebook de 1500 em 3x no crédito Inter"));
        transactionRepository.flush();
        assertThat(response.amount()).isEqualByComparingTo("1500");
        assertThat(response.purchaseTotal()).isEqualByComparingTo("1500");
        assertThat(response.installmentNumber()).isNull();
        assertThat(response.installmentCount()).isEqualTo(3);
        assertThat(installmentRepository.findAll()).hasSize(3).allSatisfy(transaction -> {
            assertThat(transaction.getPurchase().getUuid()).isEqualTo(response.purchaseUuid());
            assertThat(transaction.getAmount()).isEqualByComparingTo("500");
            assertThat(transaction.getPurchase().getAmount()).isEqualByComparingTo("1500");
        });
        var details = creditCardService.getByUuid(card.getUuid());
        assertThat(details.invoices()).extracting(invoice -> invoice.referenceMonth())
                .containsExactly("2027-01", "2026-12", "2026-11");
        assertThat(details.invoices()).allSatisfy(invoice -> assertThat(invoice.total()).isEqualByComparingTo("500"));
        assertThat(details.availableLimit()).isEqualByComparingTo("3500");
        var firstInvoice = invoiceRepository.findByCreditCardIdAndReferenceMonth(card.getId(), "2026-11").orElseThrow();
        var rows = creditCardService.getInvoiceTransactions(card.getUuid(), firstInvoice.getUuid(), 0, 20).getContent();
        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst().installmentNumber()).isEqualTo(1);
        assertThat(rows.getFirst().installmentCount()).isEqualTo(3);
        firstInvoice.setStatus(com.vikash_api.enums.CreditCardInvoiceStatus.PAID);
        invoiceRepository.saveAndFlush(firstInvoice);
        assertThat(creditCardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("4000");
        invoiceRepository.findAll().forEach(invoice -> invoice.setStatus(com.vikash_api.enums.CreditCardInvoiceStatus.PAID));
        invoiceRepository.flush();
        assertThat(creditCardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("5000");
    }

    @Test
    void roundingPreservesTotalAndDay31DoesNotSkipFebruaryInvoice() {
        card.setClosingDay(31);
        creditCardRepository.saveAndFlush(card);
        when(aiAnalysisService.analyze(any(), any())).thenReturn(new AiAnalysisResponse(
                "Compra", new BigDecimal("100.00"), TransactionType.EXPENSE, PaymentMethod.CREDIT_CARD,
                LocalDateTime.of(2027, 1, 30, 12, 0), null, card.getUuid(), null, null, null, 3, List.of()));
        transactionService.create(new TransactionRequest("Compra de 100 em 3x"));
        transactionRepository.flush();
        var transactions = installmentRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(com.vikash_api.entities.CreditCardInstallmentEntity::getInstallmentNumber)).toList();
        assertThat(transactions).extracting(transaction -> transaction.getAmount())
                .containsExactly(new BigDecimal("33.33"), new BigDecimal("33.33"), new BigDecimal("33.34"));
        assertThat(transactions).extracting(transaction -> transaction.getCreditCardInvoice().getClosingDate())
                .containsExactly(java.time.LocalDate.of(2027, 1, 31), java.time.LocalDate.of(2027, 2, 28), java.time.LocalDate.of(2027, 3, 31));
        assertThat(creditCardService.getByUuid(card.getUuid()).availableLimit()).isEqualByComparingTo("4900");
    }

    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void closedFutureInvoiceRollsBackAllEarlierInstallments() {
        var future = new com.vikash_api.entities.CreditCardInvoiceEntity();
        future.setCreditCard(card);
        future.setReferenceMonth("2027-01");
        future.setClosingDate(java.time.LocalDate.of(2027, 1, 3));
        future.setDueDate(java.time.LocalDate.of(2027, 1, 10));
        future.setStatus(com.vikash_api.enums.CreditCardInvoiceStatus.PAID);
        invoiceRepository.saveAndFlush(future);
        try {
            when(aiAnalysisService.analyze(any(), any())).thenReturn(new AiAnalysisResponse(
                    "Compra", new BigDecimal("1500"), TransactionType.EXPENSE, PaymentMethod.CREDIT_CARD,
                    LocalDateTime.of(2026, 10, 4, 12, 0), null, card.getUuid(), null, null, null, 3, List.of()));
            assertThatThrownBy(() -> transactionService.create(new TransactionRequest("Compra em 3x")))
                    .isInstanceOf(com.vikash_api.exceptions.InvalidCreditCardInvoiceException.class);
            assertThat(transactionRepository.count()).isZero();
        assertThat(purchaseRepository.count()).isZero();
        assertThat(installmentRepository.count()).isZero();
            assertThat(invoiceRepository.count()).isEqualTo(1);
        } finally {
            installmentRepository.deleteAll();
            purchaseRepository.deleteAll();
            invoiceRepository.deleteAll();
            creditCardRepository.deleteAll();
            institutionRepository.deleteAll();
            userRepository.deleteAll();
        }
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(ints = {0, -1, 121})
    void invalidInstallmentCountDoesNotSaveAnything(int count) {
        when(aiAnalysisService.analyze(any(), any())).thenReturn(new AiAnalysisResponse(
                "Compra", new BigDecimal("1500"), TransactionType.EXPENSE, PaymentMethod.CREDIT_CARD,
                LocalDateTime.of(2026, 10, 4, 12, 0), null, card.getUuid(), null, null, null, count, List.of()));
        assertThatThrownBy(() -> transactionService.create(new TransactionRequest("Compra parcelada")))
                .isInstanceOf(InvalidTransactionException.class);
        assertThat(transactionRepository.count()).isZero();
        assertThat(purchaseRepository.count()).isZero();
        assertThat(installmentRepository.count()).isZero();
        assertThat(invoiceRepository.count()).isZero();
    }

    @Test
    void remainingCentsAreDistributedWithoutCreatingDisproportionateLastInstallment() {
        when(aiAnalysisService.analyze(any(), any())).thenReturn(new AiAnalysisResponse(
                "Compra", new BigDecimal("0.05"), TransactionType.EXPENSE, PaymentMethod.CREDIT_CARD,
                LocalDateTime.of(2026, 10, 4, 12, 0), null, card.getUuid(), null, null, null, 3, List.of()));
        transactionService.create(new TransactionRequest("Compra de cinco centavos em 3x"));
        transactionRepository.flush();
        var transactions = installmentRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(com.vikash_api.entities.CreditCardInstallmentEntity::getInstallmentNumber)).toList();
        assertThat(transactions).extracting(transaction -> transaction.getAmount())
                .containsExactly(new BigDecimal("0.01"), new BigDecimal("0.02"), new BigDecimal("0.02"));
    }

    @Test
    void nonCreditInstallmentsAndAmountsBelowOneCentPerInstallmentAreRejected() {
        when(aiAnalysisService.analyze(any(), any())).thenReturn(new AiAnalysisResponse(
                "Compra", new BigDecimal("1500"), TransactionType.EXPENSE, PaymentMethod.PIX,
                LocalDateTime.of(2026, 10, 4, 12, 0), null, null, null, null, null, 3, List.of()));
        assertThatThrownBy(() -> transactionService.create(new TransactionRequest("Compra em 3x por Pix")))
                .isInstanceOf(InvalidTransactionException.class).hasMessageContaining("somente no cartão");
        when(aiAnalysisService.analyze(any(), any())).thenReturn(new AiAnalysisResponse(
                "Compra", new BigDecimal("0.01"), TransactionType.EXPENSE, PaymentMethod.CREDIT_CARD,
                LocalDateTime.of(2026, 10, 4, 12, 0), null, card.getUuid(), null, null, null, 3, List.of()));
        assertThatThrownBy(() -> transactionService.create(new TransactionRequest("Compra de um centavo em 3x")))
                .isInstanceOf(InvalidTransactionException.class).hasMessageContaining("pelo menos R$ 0,01");
        assertThat(transactionRepository.count()).isZero();
        assertThat(purchaseRepository.count()).isZero();
        assertThat(installmentRepository.count()).isZero();
        assertThat(invoiceRepository.count()).isZero();
    }

    @Test
    void editCardUpdatesOwnedCardWithoutChangingExistingInvoiceDates() {
        when(aiAnalysisService.analyze(any(), any())).thenReturn(analysis(card.getUuid(), List.of()));
        transactionService.create(new TransactionRequest("Compra no Inter"));
        var invoice = invoiceRepository.findAll().getFirst();
        var closing = invoice.getClosingDate();
        var due = invoice.getDueDate();
        var request = new com.vikash_api.dtos.requests.CreditCardRequest(card.getFinancialInstitution().getId(),
                "Inter principal", new BigDecimal("6000"), 5, 15);
        var updated = creditCardService.update(card.getUuid(), request);
        assertThat(updated.uuid()).isEqualTo(card.getUuid());
        assertThat(updated.description()).isEqualTo("Inter principal");
        assertThat(updated.creditLimit()).isEqualByComparingTo("6000");
        assertThat(invoice.getClosingDate()).isEqualTo(closing);
        assertThat(invoice.getDueDate()).isEqualTo(due);
        assertThat(creditCardRepository.count()).isEqualTo(1);
        var other = userRepository.save(UserEntity.builder().name("Outro").email("edit@test.local").password("test-only").build());
        when(authenticatedUserService.getCurrentUser()).thenReturn(other);
        assertThatThrownBy(() -> creditCardService.update(card.getUuid(), request)).isInstanceOf(CreditCardInvoiceNotFoundException.class);
    }

    @Test
    void cardDetailsIncludePaidInvoicesButLoadOnlySelectedInvoiceTransactionsInPages() {
        when(aiAnalysisService.analyze(any(), any())).thenReturn(analysis(card.getUuid(), List.of()));
        var created = transactionService.create(new TransactionRequest("Compra de novembro"));
        var invoice = invoiceRepository.findByUuidAndCreditCardUserId(created.creditCardInvoiceUuid(), card.getUser().getId()).orElseThrow();
        for (int index = 0; index < 20; index++) {
            when(aiAnalysisService.analyze(any(), any())).thenReturn(new AiAnalysisResponse(
                    "Compra " + index, new BigDecimal("10.00"), TransactionType.EXPENSE, PaymentMethod.CREDIT_CARD,
                    LocalDateTime.of(2026, 10, 4, 13, index), null, card.getUuid(), null, null, null, 1, List.of()));
            transactionService.create(new TransactionRequest("Compra de teste"));
        }
        var paid = new com.vikash_api.entities.CreditCardInvoiceEntity();
        paid.setCreditCard(card);
        paid.setReferenceMonth("2026-09");
        paid.setClosingDate(java.time.LocalDate.of(2026, 9, 3));
        paid.setDueDate(java.time.LocalDate.of(2026, 9, 10));
        paid.setStatus(com.vikash_api.enums.CreditCardInvoiceStatus.PAID);
        invoiceRepository.saveAndFlush(paid);
        transactionRepository.flush();
        var details = creditCardService.getByUuid(card.getUuid());
        assertThat(details.invoices()).hasSize(2);
        assertThat(details.invoices().getFirst().total()).isEqualByComparingTo("300.00");
        assertThat(details.availableLimit()).isEqualByComparingTo("4700.00");
        assertThat(details.currentInvoiceUuid()).isEqualTo(invoice.getUuid());
        var firstPage = creditCardService.getInvoiceTransactions(card.getUuid(), invoice.getUuid(), 0, 20);
        var secondPage = creditCardService.getInvoiceTransactions(card.getUuid(), invoice.getUuid(), 1, 20);
        assertThat(firstPage.getContent()).hasSize(20);
        assertThat(firstPage.hasNext()).isTrue();
        assertThat(firstPage.getContent().getFirst().description()).isEqualTo("Compra 19");
        assertThat(secondPage.getContent()).hasSize(1);
        assertThat(secondPage.hasNext()).isFalse();
        assertThat(firstPage.getContent()).doesNotContainAnyElementsOf(secondPage.getContent());
        assertThat(creditCardService.getInvoiceTransactions(card.getUuid(), paid.getUuid(), 0, 20)).isEmpty();
        assertThatThrownBy(() -> creditCardService.getInvoiceTransactions(UUID.randomUUID(), invoice.getUuid(), 0, 20))
                .isInstanceOf(CreditCardInvoiceNotFoundException.class);
        assertThatThrownBy(() -> creditCardService.getInvoiceTransactions(card.getUuid(), invoice.getUuid(), -1, 20))
                .isInstanceOf(com.vikash_api.exceptions.InvalidCreditCardInvoiceException.class);
        var otherUser = userRepository.save(UserEntity.builder().name("Outro").email("details@test.local").password("test-only").build());
        when(authenticatedUserService.getCurrentUser()).thenReturn(otherUser);
        assertThatThrownBy(() -> creditCardService.getByUuid(card.getUuid())).isInstanceOf(CreditCardInvoiceNotFoundException.class);
        assertThatThrownBy(() -> creditCardService.getInvoiceTransactions(card.getUuid(), invoice.getUuid(), 0, 20))
                .isInstanceOf(CreditCardInvoiceNotFoundException.class);
    }

    @Test
    void summaryWithoutInvoiceShowsFullLimitAndSelectsOldestUnpaidInvoiceAcrossPeriods() {
        var empty = creditCardService.get().creditCards().getFirst();
        assertThat(empty.availableLimit()).isEqualByComparingTo("5000");
        assertThat(empty.currentInvoice()).isNull();
        var october = analysis(card.getUuid(), List.of());
        october = new AiAnalysisResponse(october.description(), october.amount(), october.type(), october.paymentMethod(),
                LocalDateTime.of(2026, 10, 2, 12, 0), null, card.getUuid(), null, null, null, 1, List.of());
        when(aiAnalysisService.analyze(any(), any())).thenReturn(october).thenReturn(analysis(card.getUuid(), List.of()));
        transactionService.create(new TransactionRequest("Compra de outubro"));
        transactionService.create(new TransactionRequest("Compra de novembro"));
        var summary = creditCardService.get().creditCards().getFirst();
        assertThat(summary.currentInvoice().referenceMonth()).isEqualTo("2026-10");
        assertThat(summary.currentInvoice().total()).isEqualByComparingTo("100");
        assertThat(summary.availableLimit()).isEqualByComparingTo("4800");
        var firstInvoice = invoiceRepository.findByCreditCardIdAndReferenceMonth(card.getId(), "2026-10").orElseThrow();
        firstInvoice.setStatus(com.vikash_api.enums.CreditCardInvoiceStatus.PAID);
        invoiceRepository.saveAndFlush(firstInvoice);
        var afterPayment = creditCardService.get().creditCards().getFirst();
        assertThat(afterPayment.currentInvoice().referenceMonth()).isEqualTo("2026-11");
        assertThat(afterPayment.availableLimit()).isEqualByComparingTo("4900");
    }
}
