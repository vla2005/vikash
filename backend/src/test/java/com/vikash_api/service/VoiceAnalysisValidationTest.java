package com.vikash_api.service;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import com.vikash_api.dtos.responses.AiAnalysisResponse;
import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.enums.TransactionType;
import com.vikash_api.exceptions.VoiceAnalysisValidationException;
import com.vikash_api.exceptions.AiAnalysisUnavailableException;
import com.vikash_api.services.TransactionService;

class VoiceAnalysisValidationTest {
    private final TransactionService service = mock(TransactionService.class, CALLS_REAL_METHODS);
    private final UUID account = UUID.randomUUID();
    private final UUID card = UUID.randomUUID();
    private AiAnalysisResponse analysis(TransactionType type, PaymentMethod method, UUID source, UUID selectedCard,
            UUID destination, UUID invoice, BigDecimal amount, List<String> missing) {
        return new AiAnalysisResponse("Farmácia", amount, type, method, LocalDateTime.of(2026, 10, 13, 12, 0),
                source, selectedCard, destination, null, null, 1, missing, invoice);
    }
    private void validate(AiAnalysisResponse value) { ReflectionTestUtils.invokeMethod(service, "validateAnalysis", value); }
    @Test void backendFindsBothMissingBankAndMethodEvenWhenAiOmitsTheList() {
        var value = analysis(TransactionType.EXPENSE, null, null, null, null, null, new BigDecimal("50"), List.of());
        var ex = catchThrowableOfType(VoiceAnalysisValidationException.class, () -> validate(value));
        assertThat(ex.getCode()).isEqualTo("VOICE_INFORMATION_REQUIRED");
        assertThat(ex.getMissingFields()).containsExactly("paymentMethod", "accountUuid");
        assertThat(ex.getFieldErrors().get("accountUuid")).contains("conta ou banco");
        assertThat(ex.getFieldErrors().get("paymentMethod")).contains("Pix", "débito", "crédito");
    }
    @Test void askingForMethodDoesNotAlsoAskForAnAlreadyKnownAccount() {
        var ex = catchThrowableOfType(VoiceAnalysisValidationException.class, () -> validate(
                analysis(TransactionType.EXPENSE, null, account, null, null, null, new BigDecimal("50"), List.of())));
        assertThat(ex.getMissingFields()).containsExactly("paymentMethod");
    }
    @Test void asksForACardInsteadOfABankAccountForCreditPurchases() {
        var ex = catchThrowableOfType(VoiceAnalysisValidationException.class, () -> validate(
                analysis(TransactionType.EXPENSE, PaymentMethod.CREDIT_CARD, null, null, null, null, new BigDecimal("50"), List.of())));
        assertThat(ex.getMissingFields()).containsExactly("creditCardUuid");
        assertThatCode(() -> validate(analysis(TransactionType.EXPENSE, PaymentMethod.CREDIT_CARD, null, card, null, null,
                new BigDecimal("50"), List.of()))).doesNotThrowAnyException();
    }
    @Test void asksOnlyForMissingTransferDestination() {
        var ex = catchThrowableOfType(VoiceAnalysisValidationException.class, () -> validate(
                analysis(TransactionType.TRANSFER, PaymentMethod.PIX, account, null, null, null, new BigDecimal("50"), List.of())));
        assertThat(ex.getMissingFields()).containsExactly("destinationAccountUuid");
    }
    @Test void invoiceDoesNotRequireSpokenAmountOrDescriptionAndPointsOutOnlyMissingInvoice() {
        var value = new AiAnalysisResponse(null, null, TransactionType.INVOICE_PAYMENT, PaymentMethod.OTHER,
                LocalDateTime.now(), account, card, null, null, null, 1, List.of(), null);
        var missingInvoice = value;
        var ex = catchThrowableOfType(VoiceAnalysisValidationException.class, () -> validate(missingInvoice));
        assertThat(ex.getMissingFields()).containsExactly("creditCardInvoiceUuid");
        value = new AiAnalysisResponse(null, null, TransactionType.INVOICE_PAYMENT, PaymentMethod.OTHER,
                LocalDateTime.now(), account, card, null, null, null, 1, List.of(), UUID.randomUUID());
        var complete = value;
        assertThatCode(() -> validate(complete)).doesNotThrowAnyException();
    }
    @Test void preservesAndDeduplicatesAiDiagnosticsWithoutSavingGuesswork() {
        var ex = catchThrowableOfType(VoiceAnalysisValidationException.class, () -> validate(
                analysis(TransactionType.EXPENSE, PaymentMethod.PIX, null, null, null, null, null,
                        List.of("amount", "accountUuid", "amount"))));
        assertThat(ex.getMissingFields()).containsExactly("amount", "accountUuid");
    }
    @Test void unsupportedOperationsAreReviewErrorsRatherThanMissingBankErrors() {
        var ex = catchThrowableOfType(VoiceAnalysisValidationException.class, () -> validate(
                analysis(TransactionType.EXPENSE, PaymentMethod.PIX, account, null, null, null, new BigDecimal("50"),
                        List.of("multipleTransactions"))));
        assertThat(ex.getCode()).isEqualTo("VOICE_INPUT_INVALID");
        assertThat(ex.getMessage()).contains("um lançamento por vez");
    }
    @Test void nullOrUnknownProviderOutputIsTechnicalFailure() {
        assertThatThrownBy(() -> validate(null)).isInstanceOf(AiAnalysisUnavailableException.class);
        assertThatThrownBy(() -> validate(analysis(TransactionType.EXPENSE, PaymentMethod.PIX, account, null, null,
                null, new BigDecimal("50"), List.of("fakeField")))).isInstanceOf(AiAnalysisUnavailableException.class);
    }
}
