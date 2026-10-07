package com.vikash_api.dtos.requests;

import com.vikash_api.validation.Utf8Size;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserRequest(
    @NotBlank(message = "Informe seu nome.")
    @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres.")
    @Pattern(regexp = "(?s).*\\S.*\\S.*", message = "O nome deve ter pelo menos 2 caracteres além dos espaços.")
    String name,

    @NotBlank(message = "Informe seu e-mail.")
    @Email(message = "Informe um e-mail válido.")
    @Size(max = 150, message = "O e-mail deve ter até 150 caracteres.")
    String email,

    @Utf8Size(max = 72, message = "A senha deve ter até 72 bytes em UTF-8.")
    String password
) {
    public UserRequest(String name, String email) {
        this(name, email, null);
    }

    public UserRequest {
        if (name != null) { name = name.trim(); }
        if (email != null) { email = email.trim(); }
    }
}
