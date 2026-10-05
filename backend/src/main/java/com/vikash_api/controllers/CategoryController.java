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
import org.springframework.web.bind.annotation.RestController;

import com.vikash_api.dtos.requests.CategoryRequest;
import com.vikash_api.dtos.responses.AllCategoriesResponse;
import com.vikash_api.services.CategoryService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/category")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping("/create")
    public ResponseEntity<Void> createCategory(@Valid @RequestBody CategoryRequest request) {
        categoryService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping
    public ResponseEntity<AllCategoriesResponse> getCategories() {
        return ResponseEntity.status(HttpStatus.OK).body(categoryService.get());
    }

    @PutMapping("/update/{uuid}")
    public ResponseEntity<Void> updateCategory(@PathVariable UUID uuid, @Valid @RequestBody CategoryRequest request) {
        categoryService.update(uuid, request);
        return ResponseEntity.noContent().build();
    }
}
