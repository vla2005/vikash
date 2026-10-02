package com.vikash_api.services;

import java.util.UUID;

import org.springframework.stereotype.Service;

import com.vikash_api.dtos.requests.CategoryRequest;
import com.vikash_api.dtos.responses.CategoryResponse;
import com.vikash_api.entities.CustomCategoryEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.exceptions.CategoryNotFoundException;
import com.vikash_api.repositories.CustomCategoryRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UpdateCustomCategoryService {

    private final AuthenticatedUserService authenticatedUserService;
    private final CustomCategoryRepository customCategoryRepository;

    @Transactional
    public CategoryResponse updateCategory(UUID uuid, CategoryRequest request) {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();

        CustomCategoryEntity categoryEntity = customCategoryRepository.findByUuidAndUserId(uuid, currentUser.getId())
                .orElseThrow(() -> new CategoryNotFoundException("Categoria não encontrada."));
        
                
        categoryEntity.setName(request.name());
        categoryEntity.setIcon(request.icon());
        categoryEntity.setColor(request.color());
        customCategoryRepository.save(categoryEntity);
        return new CategoryResponse(uuid, categoryEntity.getName(), categoryEntity.getIcon(), categoryEntity.getColor());
    }
}
