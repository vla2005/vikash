package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.enums.TransactionType;

public record AiAnalysisResponse(
    String description,
    BigDecimal amount,
    TransactionType type,
    PaymentMethod paymentMethod,
    LocalDateTime occurredAt,
    UUID accountUuid,
    UUID destinationAccountUuid,
    String defaultCategoryName,
    UUID customCategoryUuid,
    List<String> missingFields
) {
}
