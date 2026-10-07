package com.vikash_api.exceptions;

import lombok.Getter;

@Getter
public class RequestLimitException extends RuntimeException {
    private final long retryAfterSeconds;

    public RequestLimitException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }
}
