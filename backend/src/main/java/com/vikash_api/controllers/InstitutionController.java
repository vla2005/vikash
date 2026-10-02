package com.vikash_api.controllers;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.vikash_api.entities.FinancialInstitutionEntity;
import com.vikash_api.repositories.InstitutionRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/institutions")
@RequiredArgsConstructor
public class InstitutionController {

    private final InstitutionRepository institutionRepository;
    
    @GetMapping
    public List<FinancialInstitutionEntity> getAllIntitutions() {
        return institutionRepository.findAll();
    }
}
