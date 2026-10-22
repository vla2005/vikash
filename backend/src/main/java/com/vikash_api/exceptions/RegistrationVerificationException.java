package com.vikash_api.exceptions;

public class RegistrationVerificationException extends RuntimeException {
    public RegistrationVerificationException() {
        super("Código inválido ou expirado. Confira o e-mail ou solicite um novo cadastro.");
    }
}
