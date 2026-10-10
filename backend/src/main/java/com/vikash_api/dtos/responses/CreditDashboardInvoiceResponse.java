package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import com.vikash_api.enums.CreditCardInvoiceStatus;

public record CreditDashboardInvoiceResponse(
        UUID uuid,
        String referenceMonth,
        BigDecimal total,
        LocalDate dueDate,
        CreditCardInvoiceStatus status,
        CreditCardReferenceResponse creditCard
) {}
