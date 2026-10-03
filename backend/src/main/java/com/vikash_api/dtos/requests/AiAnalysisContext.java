package com.vikash_api.dtos.requests;

import java.util.List;

import com.vikash_api.dtos.responses.AccountAnalysisContext;
import com.vikash_api.dtos.responses.CategoryResponse;

public record AiAnalysisContext(
        List<AccountAnalysisContext> accounts,
        List<CategoryResponse> defaultCategories,
        List<CategoryResponse> customCategories) {
}
