package com.vikash_api.dtos.requests;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CreditCardInvoiceRequest(
    @NotNull(message = "Informe o UUID do cartão.")
    UUID creditCardUuid,

    @NotBlank(message = "Informe o mês de referência da fatura.")
    @Pattern(regexp = "[0-9]{4}-(0[1-9]|1[0-2])", message = "O mês de referência deve estar no formato AAAA-MM.")
    String referenceMonth,

    @NotNull(message = "Informe a data de fechamento.")
    LocalDate closingDate,

    @NotNull(message = "Informe a data de vencimento.")
    LocalDate dueDate
) {
    public CreditCardInvoiceRequest {
        if (referenceMonth != null) { referenceMonth = referenceMonth.trim(); }
    }
}
