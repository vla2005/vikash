package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.util.UUID;

public record CategoryExpenseResponse(
        Long defaultCategoryId,
        UUID customCategoryUuid,
        String name,
        String color,
        String icon,
        BigDecimal total
) {
}
