package com.vikash_api.dtos.requests;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;

public record ConfirmRegistrationRequest(
        @NotNull(message = "Solicite um novo código de cadastro.") UUID challengeId,
        @NotBlank(message = "Informe o código recebido por e-mail.")
        @Pattern(regexp = "[0-9]{8}", message = "Informe os 8 números do código.") String code) {}
