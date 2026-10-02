package com.vikash_api.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.vikash_api.entities.FinancialInstitutionEntity;

@Repository 
public interface InstitutionRepository extends JpaRepository<FinancialInstitutionEntity, Long> {
    List<FinancialInstitutionEntity> findAll();
}
