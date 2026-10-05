package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreditCardDetailsResponse(UUID uuid, String description, BigDecimal creditLimit,
        BigDecimal availableLimit, Integer closingDay, Integer dueDay,
        FinancialInstitutionResponse financialInstitution, UUID currentInvoiceUuid,
        List<CreditCardInvoiceSummaryResponse> invoices) {}
