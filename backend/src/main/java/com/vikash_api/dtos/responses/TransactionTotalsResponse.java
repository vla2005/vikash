package com.vikash_api.dtos.responses;

import java.math.BigDecimal;

public record TransactionTotalsResponse(
        BigDecimal incomes,
        BigDecimal expenses,
        BigDecimal incomesPercentageChange,
        BigDecimal expensesPercentageChange
) {
    public TransactionTotalsResponse(BigDecimal incomes, BigDecimal expenses) {
        this(incomes, expenses, null, null);
    }
}
