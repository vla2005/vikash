package com.vikash_api.services;

import java.util.List;
import java.util.UUID;
import java.text.Normalizer;
import java.util.Locale;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vikash_api.dtos.requests.CategoryRequest;
import com.vikash_api.dtos.responses.AllCategoriesResponse;
import com.vikash_api.dtos.responses.CategoryResponse;
import com.vikash_api.entities.CustomCategoryEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.exceptions.CategoryNotFoundException;
import com.vikash_api.exceptions.CategoryAlreadyExistsException;
import com.vikash_api.repositories.CustomCategoryRepository;
import com.vikash_api.repositories.DefaultCategoryRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CategoryService {
    private final AuthenticatedUserService authenticatedUserService;
    private final CustomCategoryRepository customCategoryRepository;
    private final DefaultCategoryRepository defaultCategoryRepository;

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        CustomCategoryEntity category = new CustomCategoryEntity();
        category.setUser(authenticatedUserService.getCurrentUser());
        validateName(request.name(), category.getUser().getId(), null);
        applyRequest(category, request);
        return toResponse(customCategoryRepository.save(category));
    }

    @Transactional(readOnly = true)
    public AllCategoriesResponse get() {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        List<CategoryResponse> defaultCategories = defaultCategoryRepository.findAll().stream()
                .map(category -> new CategoryResponse(null, category.getName(), category.getIcon(), category.getColor()))
                .toList();
        List<CategoryResponse> customCategories = customCategoryRepository.findByUserId(currentUser.getId()).stream()
                .map(this::toResponse)
                .toList();
        return new AllCategoriesResponse(defaultCategories, customCategories);
    }

    @Transactional
    public CategoryResponse update(UUID uuid, CategoryRequest request) {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        CustomCategoryEntity category = customCategoryRepository.findByUuidAndUserId(uuid, currentUser.getId())
                .orElseThrow(() -> new CategoryNotFoundException("Categoria não encontrada."));
        validateName(request.name(), currentUser.getId(), uuid);
        applyRequest(category, request);
        return toResponse(customCategoryRepository.save(category));
    }

    private void applyRequest(CustomCategoryEntity category, CategoryRequest request) {
        category.setName(request.name());
        category.setIcon(request.icon());
        category.setColor(request.color());
    }

    private void validateName(String name, Long userId, UUID excludedUuid) {
        String normalized = normalizeName(name);
        boolean defaultExists = defaultCategoryRepository.findAll().stream()
                .anyMatch(category -> normalizeName(category.getName()).equals(normalized));
        boolean customExists = customCategoryRepository.findByUserId(userId).stream()
                .filter(category -> excludedUuid == null || !Objects.equals(category.getUuid(), excludedUuid))
                .anyMatch(category -> normalizeName(category.getName()).equals(normalized));
        if (defaultExists || customExists) {
            throw new CategoryAlreadyExistsException("Já existe uma categoria com esse nome.");
        }
    }

    private String normalizeName(String name) {
        return Normalizer.normalize(name.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.forLanguageTag("pt-BR"));
    }

    private CategoryResponse toResponse(CustomCategoryEntity category) {
        return new CategoryResponse(category.getUuid(), category.getName(), category.getIcon(), category.getColor());
    }
}
