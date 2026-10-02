package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.util.UUID;

import com.vikash_api.enums.AccountType;

public record AccountResponse(
    UUID uuid,
    String description,
    AccountType type,
    BigDecimal balance,
    FinancialInstitutionResponse financialInstitution
) {

}
