package com.vikash_api.exceptions;

public class TokenCompromisedException extends RuntimeException {
    public TokenCompromisedException(String message) {
        super(message);
    }
}
