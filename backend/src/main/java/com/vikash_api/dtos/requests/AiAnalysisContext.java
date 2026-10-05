package com.vikash_api.dtos.requests;

import java.util.List;

import com.vikash_api.dtos.responses.AccountAnalysisContext;
import com.vikash_api.dtos.responses.CategoryResponse;
import com.vikash_api.dtos.responses.CreditCardAnalysisContext;
import com.vikash_api.dtos.responses.CreditCardInvoiceAnalysisContext;

public record AiAnalysisContext(
        List<AccountAnalysisContext> accounts,
        List<CreditCardAnalysisContext> creditCards,
        List<CategoryResponse> defaultCategories,
        List<CategoryResponse> customCategories,
        List<CreditCardInvoiceAnalysisContext> creditCardInvoices) {
    public AiAnalysisContext(List<AccountAnalysisContext> accounts, List<CreditCardAnalysisContext> creditCards,
            List<CategoryResponse> defaultCategories, List<CategoryResponse> customCategories) {
        this(accounts, creditCards, defaultCategories, customCategories, List.of());
    }
}
