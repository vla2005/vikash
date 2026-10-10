package com.vikash_api.dtos.requests;

import java.math.BigDecimal;
import java.util.UUID;
import com.vikash_api.enums.PaymentMethod;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record TransactionUpdateRequest(
        @NotBlank(message = "Informe a descrição.")
        @Size(max = 255, message = "Use até 255 caracteres na descrição.") String description,
        @NotNull(message = "Informe o valor.")
        @Positive(message = "O valor deve ser maior que zero.")
        @Digits(integer = 13, fraction = 2, message = "Informe um valor com até 2 casas decimais.") BigDecimal amount,
        @NotNull(message = "Escolha a forma de pagamento.") PaymentMethod paymentMethod,
        UUID accountUuid,
        UUID creditCardUuid,
        UUID destinationAccountUuid,
        @Size(max = 255, message = "Categoria inválida.") String defaultCategoryName,
        UUID customCategoryUuid
) {
    public TransactionUpdateRequest {
        if (description != null) { description = description.trim(); }
    }
}
