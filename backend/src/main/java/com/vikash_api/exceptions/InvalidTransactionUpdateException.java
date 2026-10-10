package com.vikash_api.exceptions;

import lombok.Getter;

@Getter
public class InvalidTransactionUpdateException extends RuntimeException {
    private final String field;

    public InvalidTransactionUpdateException(String field, String message) {
        super(message);
        this.field = field;
    }
}
