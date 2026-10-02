package com.vikash_api.dtos.responses;

import java.util.List;

public record AllCategoriesResponse(
    List<CategoryResponse> defaultCategories,
    List<CategoryResponse> customCategories
) {

}
