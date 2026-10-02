package com.vikash_api.controllers;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.vikash_api.dtos.requests.CategoryRequest;
import com.vikash_api.dtos.responses.AllCategoriesResponse;
import com.vikash_api.dtos.responses.CategoryResponse;
import com.vikash_api.services.CreateCustomCategoryService;
import com.vikash_api.services.GetCategoriesService;
import com.vikash_api.services.UpdateCustomCategoryService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/category")
@RequiredArgsConstructor
public class CategoryController {

    private final CreateCustomCategoryService createCustomCategoryService;

    @PostMapping("/create")
    public ResponseEntity<CategoryResponse> createCategory(@Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(createCustomCategoryService.createCategory(request));
    }

    private final GetCategoriesService getCategoriesService;

    @GetMapping
    public ResponseEntity<AllCategoriesResponse> getCategories() {
        return ResponseEntity.status(HttpStatus.OK).body(getCategoriesService.getCategories());
    }

    private final UpdateCustomCategoryService updateCustomCategoryService;

    @PutMapping("/update/{uuid}")
    public ResponseEntity<CategoryResponse> updateCategory(@PathVariable UUID uuid, @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.status(HttpStatus.OK).body(updateCustomCategoryService.updateCategory(uuid, request));
    }
}
