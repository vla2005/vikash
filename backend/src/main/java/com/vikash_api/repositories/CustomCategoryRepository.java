package com.vikash_api.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Repository;

import com.vikash_api.entities.CustomCategoryEntity;

@Repository
public interface CustomCategoryRepository extends JpaRepository<CustomCategoryEntity, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM CustomCategoryEntity c WHERE c.uuid = :uuid AND c.user.id = :userId")
    Optional<CustomCategoryEntity> findOwnedForUpdate(@Param("uuid") UUID uuid, @Param("userId") Long userId);

    List<CustomCategoryEntity> findByUserId(Long userId);
    Optional<CustomCategoryEntity> findByUuidAndUserId(UUID uuid, Long userId);

    Optional<CustomCategoryEntity> findByUuid(UUID uuid);
}
