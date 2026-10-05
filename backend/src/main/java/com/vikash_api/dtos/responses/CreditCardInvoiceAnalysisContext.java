package com.vikash_api.dtos.responses;

import java.time.LocalDate;
import java.util.UUID;
import com.vikash_api.enums.CreditCardInvoiceStatus;

public record CreditCardInvoiceAnalysisContext(UUID uuid, UUID creditCardUuid, String referenceMonth,
        LocalDate closingDate, LocalDate dueDate, CreditCardInvoiceStatus status) {
}
