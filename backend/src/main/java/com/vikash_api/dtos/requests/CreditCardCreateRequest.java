package com.vikash_api.dtos.requests;

import java.math.BigDecimal;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public record CreditCardCreateRequest(
    @NotNull(message = "Informe a instituição financeira do cartão.")
    @Positive(message = "A instituição deve ter um ID positivo.")
    Long financialInstitutionId,

    @NotNull(message = "Informe os últimos quatro dígitos do cartão.")
    @Min(value = 0, message = "Informe um final de cartão entre 0000 e 9999.")
    @Max(value = 9999, message = "Informe um final de cartão entre 0000 e 9999.")
    Integer lastFourDigits,

    @NotNull(message = "Informe o limite de crédito.")
    @Positive(message = "O limite de crédito deve ser maior que zero.")
    @Digits(integer = 13, fraction = 2, message = "O limite deve ter até 13 dígitos inteiros e 2 casas decimais.")
    BigDecimal creditLimit,

    @NotNull(message = "Informe o dia de fechamento.")
    @Min(value = 1, message = "O dia de fechamento deve estar entre 1 e 31.")
    @Max(value = 31, message = "O dia de fechamento deve estar entre 1 e 31.")
    Integer closingDay,

    @NotNull(message = "Informe o dia de vencimento.")
    @Min(value = 1, message = "O dia de vencimento deve estar entre 1 e 31.")
    @Max(value = 31, message = "O dia de vencimento deve estar entre 1 e 31.")
    Integer dueDay,

    @PositiveOrZero(message = "O limite disponível não pode ser negativo.")
    @Digits(integer = 13, fraction = 2, message = "O limite disponível deve ter até 13 dígitos inteiros e 2 casas decimais.")
    BigDecimal availableLimit
) {}
