package com.vikash_api.services;

import org.springframework.stereotype.Service;

import com.vikash_api.dtos.requests.CategoryRequest;
import com.vikash_api.dtos.responses.CategoryResponse;
import com.vikash_api.entities.CustomCategoryEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.repositories.CustomCategoryRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CreateCustomCategoryService {

    private final CustomCategoryRepository customCategoryRepository;
    private final AuthenticatedUserService authenticatedUserService;

    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();

        CustomCategoryEntity categoryEntity = new CustomCategoryEntity();
        categoryEntity.setUser(currentUser);
        categoryEntity.setName(request.name());
        categoryEntity.setIcon(request.icon());
        categoryEntity.setColor(request.color());
        CustomCategoryEntity savedCategory = customCategoryRepository.save(categoryEntity);
        return new CategoryResponse(
            savedCategory.getUuid(),
            savedCategory.getName(),
            savedCategory.getIcon(),
            savedCategory.getColor()
        );
    }
}

