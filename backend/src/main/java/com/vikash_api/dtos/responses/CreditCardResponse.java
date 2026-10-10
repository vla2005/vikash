package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.util.UUID;

public record CreditCardResponse(
    UUID uuid,
    Integer lastFourDigits,
    BigDecimal creditLimit,
    Integer closingDay,
    Integer dueDay,
    FinancialInstitutionResponse financialInstitution
) {
}
