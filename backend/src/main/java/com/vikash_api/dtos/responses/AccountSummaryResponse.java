package com.vikash_api.dtos.responses;

import java.util.UUID;

import com.vikash_api.enums.AccountType;

public record AccountSummaryResponse(
    UUID uuid,
    String description,
    AccountType type,
    FinancialInstitutionResponse financialInstitution
) {
}
