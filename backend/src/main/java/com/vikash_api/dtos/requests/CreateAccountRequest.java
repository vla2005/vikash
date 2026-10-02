package com.vikash_api.dtos.requests;

import java.math.BigDecimal;

import com.vikash_api.enums.AccountType;

public record CreateAccountRequest(
    AccountType type,
    Long financialInstitutionId,
    String description,
    BigDecimal balance
) {

}
