package com.vikash_api.dtos.requests;

import java.math.BigDecimal;

import com.vikash_api.enums.AccountType;
import com.vikash_api.validation.ValidAccountInstitution;
import jakarta.validation.constraints.*;

@ValidAccountInstitution
public record AccountRequest(
    @NotNull(message = "Informe o tipo da conta.")
    AccountType type,
    @Positive(message = "A instituição deve ter um ID positivo.")
    Long financialInstitutionId,
    @NotBlank(message = "Informe a descrição da conta.")
    @Size(max = 100, message = "A descrição deve ter até 100 caracteres.")
    String description,
    @Digits(integer = 13, fraction = 2, message = "O saldo deve ter até 13 dígitos inteiros e 2 casas decimais.")
    BigDecimal balance
) {
    public AccountRequest {
        if (description != null) { description = description.trim(); }
    }
}
