package com.vikash_api.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyRegistrationLinkRequest(
        @NotBlank @Pattern(regexp = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.[A-Za-z0-9_-]{43}",
                message = "Reabra o link recebido por e-mail ou solicite um novo cadastro.") String token) {
    @Override public String toString() { return "VerifyRegistrationLinkRequest[token=REDACTED]"; }
}
