package com.vikash_api.dtos.requests;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreditCardInitialInvoicesRequest(
    @NotEmpty(message = "Informe pelo menos uma fatura.")
    @Size(max = 120, message = "Informe no máximo 120 faturas por vez.")
    List<@NotNull @Valid CreditCardInitialInvoiceRequest> invoices
) {}
