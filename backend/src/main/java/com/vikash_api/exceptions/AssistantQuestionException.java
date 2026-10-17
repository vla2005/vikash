package com.vikash_api.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AssistantQuestionException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    public AssistantQuestionException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
