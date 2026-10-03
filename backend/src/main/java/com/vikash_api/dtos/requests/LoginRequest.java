package com.vikash_api.dtos.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.vikash_api.validation.Utf8Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @NotBlank(message = "Informe seu e-mail.")
    @Email(message = "Informe um e-mail válido.")
    @Size(max = 150, message = "O e-mail deve ter até 150 caracteres.")
    private String email;

    @NotBlank(message = "Informe sua senha.")
    @Utf8Size(max = 72, message = "A senha deve ter até 72 bytes em UTF-8.")
    private String password;
}
