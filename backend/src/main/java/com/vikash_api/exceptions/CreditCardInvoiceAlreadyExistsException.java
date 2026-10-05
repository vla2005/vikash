package com.vikash_api.exceptions;

public class CreditCardInvoiceAlreadyExistsException extends RuntimeException {
    public CreditCardInvoiceAlreadyExistsException(String message) {
        super(message);
    }
}
