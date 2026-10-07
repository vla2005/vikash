package com.vikash_api.dtos.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import com.vikash_api.validation.Utf8Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Informe seu nome.")
    @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres.")
    @Pattern(regexp = "(?s).*\\S.*\\S.*", message = "O nome deve ter pelo menos 2 caracteres além dos espaços.")
    private String name;

    @NotBlank(message = "Informe seu e-mail.")
    @Email(message = "Informe um e-mail válido.")
    @Size(max = 150, message = "O e-mail deve ter até 150 caracteres.")
    private String email;

    @NotBlank(message = "Informe sua senha.")
    @Size(min = 8, message = "A senha deve ter pelo menos 8 caracteres.")
    @Utf8Size(max = 72, message = "A senha deve ter até 72 bytes em UTF-8; caracteres acentuados podem ocupar mais de um byte.")
    @Pattern(regexp = "(?s).*\\p{Lu}.*", message = "A senha deve conter pelo menos uma letra maiúscula.")
    @Pattern(regexp = "(?s).*[0-9].*", message = "A senha deve conter pelo menos um número.")
    @Pattern(regexp = "(?s).*[\\p{P}\\p{S}].*", message = "A senha deve conter pelo menos um caractere especial.")
    private String password;
}
