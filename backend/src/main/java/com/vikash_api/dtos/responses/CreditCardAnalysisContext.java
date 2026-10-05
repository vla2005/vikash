package com.vikash_api.dtos.responses;

import java.util.UUID;

public record CreditCardAnalysisContext(
    UUID uuid,
    String description,
    FinancialInstitutionResponse financialInstitution
) {
}
