package com.vikash_api.exceptions;

import lombok.Getter;

@Getter
public class InvalidCreditCardSetupException extends RuntimeException {
    private final String field;

    public InvalidCreditCardSetupException(String field, String message) {
        super(message);
        this.field = field;
    }
}
