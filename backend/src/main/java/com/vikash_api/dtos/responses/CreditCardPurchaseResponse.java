package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record CreditCardPurchaseResponse(
    UUID uuid,
    String description,
    BigDecimal amount,
    LocalDateTime occurredAt,
    CreditCardReferenceResponse creditCard,
    CategoryResponse category,
    String transcription,
    Integer installmentCount,
    List<CreditCardInstallmentResponse> installments,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
