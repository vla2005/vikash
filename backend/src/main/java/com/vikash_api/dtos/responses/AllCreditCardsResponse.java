package com.vikash_api.dtos.responses;

import java.util.List;

public record AllCreditCardsResponse(List<CreditCardSummaryResponse> creditCards) {
}
