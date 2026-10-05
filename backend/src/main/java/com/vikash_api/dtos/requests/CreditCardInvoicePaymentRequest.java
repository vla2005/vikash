package com.vikash_api.dtos.requests;

import java.time.LocalDateTime;
import java.util.UUID;
import com.vikash_api.enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

public record CreditCardInvoicePaymentRequest(
        @NotNull(message = "Informe a conta utilizada para pagar a fatura.") UUID accountUuid,
        @NotNull(message = "Informe a forma de pagamento.") PaymentMethod paymentMethod,
        @NotNull(message = "Informe a data do pagamento.")
        @PastOrPresent(message = "O pagamento não pode estar no futuro.") LocalDateTime occurredAt) {
}
