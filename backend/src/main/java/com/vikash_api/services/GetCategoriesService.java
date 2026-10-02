package com.vikash_api.services;

import java.util.List;

import org.springframework.stereotype.Service;

import com.vikash_api.dtos.responses.AllCategoriesResponse;
import com.vikash_api.dtos.responses.CategoryResponse;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.repositories.CustomCategoryRepository;
import com.vikash_api.repositories.DefaultCategoryRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GetCategoriesService {

    private final AuthenticatedUserService authenticatedUserService;
    private final DefaultCategoryRepository defaultCategoryRepository;
    private final CustomCategoryRepository customCategoryRepository;

    public AllCategoriesResponse getCategories() {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();

        List<CategoryResponse> defaultCategories = defaultCategoryRepository.findAll().stream()
                .map(category -> new CategoryResponse(
                    null,
                    category.getName(),
                    category.getIcon(),
                    category.getColor()
                ))
                .toList();

        List<CategoryResponse> customCategories = customCategoryRepository.findByUserId(currentUser.getId()).stream()
                .map(category -> new CategoryResponse(
                    category.getUuid(),
                    category.getName(),
                    category.getIcon(),
                    category.getColor()
                ))
                .toList();
                
        return new AllCategoriesResponse(defaultCategories, customCategories);
    }

}
