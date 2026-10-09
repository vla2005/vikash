package com.vikash_api.repositories.projections;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import com.vikash_api.enums.CreditCardInvoiceStatus;

// Projeção interna da consulta; não é exposta pela API.
public record InvoiceAmountProjection(
    Long creditCardId,
    UUID uuid,
    String referenceMonth,
    LocalDate closingDate,
    LocalDate dueDate,
    CreditCardInvoiceStatus status,
    BigDecimal initialAmount,
    BigDecimal total
) {
}
