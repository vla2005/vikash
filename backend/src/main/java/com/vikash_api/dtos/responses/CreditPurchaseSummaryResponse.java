package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record CreditPurchaseSummaryResponse(
        UUID uuid,
        String description,
        BigDecimal amount,
        LocalDateTime occurredAt,
        Integer installmentCount,
        CreditCardReferenceResponse creditCard,
        CategoryResponse category
) {}
