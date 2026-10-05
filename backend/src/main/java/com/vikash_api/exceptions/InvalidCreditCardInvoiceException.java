package com.vikash_api.exceptions;

public class InvalidCreditCardInvoiceException extends RuntimeException {
    public InvalidCreditCardInvoiceException(String message) {
        super(message);
    }
}
