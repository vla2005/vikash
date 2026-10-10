package com.vikash_api.dtos.responses;

import java.util.UUID;

public record CreditCardAnalysisContext(
    UUID uuid,
    Integer lastFourDigits,
    FinancialInstitutionResponse financialInstitution
) {
}
