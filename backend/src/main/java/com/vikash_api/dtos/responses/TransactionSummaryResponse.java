package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.enums.TransactionType;

public record TransactionSummaryResponse(
        UUID uuid,
        String description,
        BigDecimal amount,
        TransactionType type,
        PaymentMethod paymentMethod,
        LocalDateTime occurredAt,
        String categoryName,
        String categoryColor,
        String categoryIcon,
        String institutionName,
        Integer installmentNumber,
        Integer installmentCount
    ) {}
