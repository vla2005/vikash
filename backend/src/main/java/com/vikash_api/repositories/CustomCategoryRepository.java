package com.vikash_api.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.vikash_api.entities.CustomCategoryEntity;

@Repository
public interface CustomCategoryRepository extends JpaRepository<CustomCategoryEntity, Long> {
    List<CustomCategoryEntity> findByUserId(Long userId);
    Optional<CustomCategoryEntity> findByUuidAndUserId(UUID uuid, Long userId);
}
