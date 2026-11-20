package com.vikash_api.exceptions;

public class RegistrationVerificationException extends RuntimeException {
    public RegistrationVerificationException() {
        super("Link ou código inválido, expirado ou já utilizado. Confira o e-mail ou solicite um novo cadastro.");
    }
}
