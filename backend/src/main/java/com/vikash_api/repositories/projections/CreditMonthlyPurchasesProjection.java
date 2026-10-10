package com.vikash_api.repositories.projections;

import java.math.BigDecimal;

public record CreditMonthlyPurchasesProjection(Integer year, Integer month, BigDecimal total, Long purchaseCount) {}
