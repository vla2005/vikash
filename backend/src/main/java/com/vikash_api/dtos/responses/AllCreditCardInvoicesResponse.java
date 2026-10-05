package com.vikash_api.dtos.responses;

import java.util.List;

public record AllCreditCardInvoicesResponse(List<CreditCardInvoiceResponse> invoices) {
}
