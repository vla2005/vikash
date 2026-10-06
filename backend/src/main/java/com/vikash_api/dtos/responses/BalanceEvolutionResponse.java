package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BalanceEvolutionResponse(LocalDate date, BigDecimal balance) {
}
