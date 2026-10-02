package com.vikash_api.dtos.responses;

import java.math.BigDecimal;

import com.vikash_api.enums.AccountType;

public record AccountResponse(
    Long id,
    String description,
    AccountType type,
    BigDecimal balance,
    FinancialInstitutionResponse financialInstitution
) {

}
