package com.vikash_api.exceptions;

import org.springframework.http.HttpStatus;
import lombok.Getter;

@Getter
public class DebtException extends RuntimeException {
    private final HttpStatus status;
    private final String field;

    public DebtException(HttpStatus status, String field, String message) {
        super(message);
        this.status = status;
        this.field = field;
    }
}
