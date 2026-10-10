package com.vikash_api.repositories.projections;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import com.vikash_api.enums.CreditCardInvoiceStatus;

public record CreditDashboardInvoiceProjection(
        UUID uuid, String referenceMonth, BigDecimal total, LocalDate dueDate, CreditCardInvoiceStatus status,
        UUID creditCardUuid, String creditCardDescription,
        Long institutionId, String institutionName, String institutionLogoUrl
) {}
