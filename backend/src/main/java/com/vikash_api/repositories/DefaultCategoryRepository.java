package com.vikash_api.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.vikash_api.entities.DefaultCategoriesEntity;

@Repository
public interface DefaultCategoryRepository extends JpaRepository<DefaultCategoriesEntity, Long> {
    List<DefaultCategoriesEntity> findAll();
}
