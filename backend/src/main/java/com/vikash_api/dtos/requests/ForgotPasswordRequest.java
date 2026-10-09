package com.vikash_api.dtos.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Locale;

public record ForgotPasswordRequest(
        @NotBlank(message = "Informe seu e-mail.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 150, message = "O e-mail deve ter até 150 caracteres.")
        String email
) {
    public ForgotPasswordRequest {
        if (email != null) { email = email.trim().toLowerCase(Locale.ROOT); }
    }
}
