package com.vikash_api.dtos.responses;

import java.util.UUID;

public record CreditCardReferenceResponse(
    UUID uuid,
    Integer lastFourDigits,
    FinancialInstitutionResponse financialInstitution
) {
}
