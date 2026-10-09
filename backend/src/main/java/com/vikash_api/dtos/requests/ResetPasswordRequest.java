package com.vikash_api.dtos.requests;

import com.vikash_api.validation.Utf8Size;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "Informe o token de recuperação.")
        @Pattern(regexp = "[A-Za-z0-9_-]{43}", message = "O token de recuperação está em formato inválido.")
        String token,

        @NotBlank(message = "Informe sua nova senha.")
        @Size(min = 8, message = "A nova senha deve ter pelo menos 8 caracteres.")
        @Utf8Size(max = 72, message = "A nova senha deve ter até 72 bytes em UTF-8; caracteres acentuados podem ocupar mais de um byte.")
        @Pattern(regexp = "(?s).*\\p{Lu}.*", message = "A nova senha deve conter pelo menos uma letra maiúscula.")
        @Pattern(regexp = "(?s).*[0-9].*", message = "A nova senha deve conter pelo menos um número.")
        @Pattern(regexp = "(?s).*[\\p{P}\\p{S}].*", message = "A nova senha deve conter pelo menos um caractere especial.")
        String newPassword
) {
}
