package com.vikash_api.dtos.responses;

import java.math.BigDecimal;

public record CreditMonthlyPurchasesResponse(String referenceMonth, BigDecimal total, long purchaseCount) {}
