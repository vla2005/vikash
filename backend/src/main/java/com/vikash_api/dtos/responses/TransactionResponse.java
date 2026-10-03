package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.enums.TransactionType;

public record TransactionResponse(
    UUID uuid,
    String description,
    BigDecimal amount,
    TransactionType type,
    PaymentMethod paymentMethod,
    LocalDateTime occurredAt,
    UUID accountUuid,
    UUID destinationAccountUuid,
    String defaultCategoryName,
    UUID customCategoryUuid,
    String transcription,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

}
