package com.vikash_api.dtos.requests;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

public record ExternalInvoicePaymentRequest(
        @NotNull(message = "Informe a data do pagamento.")
        @PastOrPresent(message = "O pagamento não pode estar no futuro.") LocalDateTime occurredAt) {
}
