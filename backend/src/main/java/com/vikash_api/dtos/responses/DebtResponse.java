package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record DebtResponse(UUID uuid, String creditor, String description, BigDecimal totalAmount,
        int installmentCount, int paidInstallments, List<Installment> installments, long version, boolean hasRecordedPayments) {

    public record Installment(int number, LocalDate dueDate, BigDecimal amount) {
    }
}
