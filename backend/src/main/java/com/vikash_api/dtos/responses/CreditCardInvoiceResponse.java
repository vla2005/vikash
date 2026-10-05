package com.vikash_api.dtos.responses;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.vikash_api.enums.CreditCardInvoiceStatus;

public record CreditCardInvoiceResponse(
    UUID uuid,
    UUID creditCardUuid,
    String creditCardDescription,
    String referenceMonth,
    LocalDate closingDate,
    LocalDate dueDate,
    CreditCardInvoiceStatus status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
