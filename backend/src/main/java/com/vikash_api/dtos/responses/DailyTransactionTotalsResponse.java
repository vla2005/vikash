package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyTransactionTotalsResponse(LocalDate date, BigDecimal incomes, BigDecimal expenses) {
}
