package com.vikash_api.dtos.requests;

import java.util.UUID;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record DebtPaymentRequest(
        @NotNull(message = "Escolha a conta do pagamento.") UUID accountUuid,
        @NotNull @Min(0) Long version) {
}
