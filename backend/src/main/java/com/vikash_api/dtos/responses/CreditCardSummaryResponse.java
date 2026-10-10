package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.util.UUID;

public record CreditCardSummaryResponse(
    UUID uuid,
    Integer lastFourDigits,
    BigDecimal creditLimit,
    BigDecimal availableLimit,
    Integer closingDay,
    Integer dueDay,
    FinancialInstitutionResponse financialInstitution,
    CreditCardInvoiceSummaryResponse currentInvoice,
    BigDecimal usedLimit,
    BigDecimal unallocatedUsedLimit
) {
}
