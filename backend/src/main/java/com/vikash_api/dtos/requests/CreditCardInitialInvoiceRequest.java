package com.vikash_api.dtos.requests;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;

public record CreditCardInitialInvoiceRequest(
    @NotBlank(message = "Informe o mês de referência.")
    @Pattern(regexp = "[0-9]{4}-(0[1-9]|1[0-2])", message = "O mês deve estar no formato AAAA-MM.")
    String referenceMonth,

    @NotNull(message = "Informe o valor inicial da fatura.")
    @PositiveOrZero(message = "O valor inicial não pode ser negativo.")
    @Digits(integer = 13, fraction = 2, message = "O valor deve ter até 13 dígitos inteiros e 2 casas decimais.")
    BigDecimal initialAmount,

    @NotNull(message = "Informe a data de fechamento.") LocalDate closingDate,
    @NotNull(message = "Informe a data de vencimento.") LocalDate dueDate
) {
    public CreditCardInitialInvoiceRequest {
        if (referenceMonth != null) { referenceMonth = referenceMonth.trim(); }
    }
}
