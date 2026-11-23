package com.vikash_api.dtos.requests;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DebtRequest(
        @NotNull UUID uuid,
        @NotBlank(message = "Informe para quem você deve.")
        @Size(max = 100, message = "Use até 100 caracteres.") String creditor,
        @Size(max = 500, message = "Use até 500 caracteres.") String description,
        @NotNull @DecimalMin(value = "0.01", message = "Informe um valor maior que zero.")
        @Digits(integer = 10, fraction = 2, message = "Informe um valor válido.") BigDecimal totalAmount,
        @NotNull @Min(value = 1, message = "Informe de 1 a 120 parcelas.")
        @Max(value = 120, message = "Informe de 1 a 120 parcelas.") Integer installmentCount,
        @NotNull @Min(value = 0, message = "Informe zero ou mais parcelas.")
        @Max(value = 120, message = "Informe até 120 parcelas pagas.") Integer paidInstallments,
        LocalDate nextDueDate,
        @Min(0) Long version) {
}
