package com.vikash_api.repositories;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import com.vikash_api.entities.CreditCardEntity;

@Repository
public interface CreditCardRepository extends JpaRepository<CreditCardEntity, Long> {
    Optional<CreditCardEntity> findByUuidAndUserId(UUID uuid, Long userId);

    @EntityGraph(attributePaths = "financialInstitution")
    List<CreditCardEntity> findByUserIdAndActiveTrue(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM CreditCardEntity c WHERE c.uuid = :uuid AND c.user.id = :userId")
    Optional<CreditCardEntity> findOwnedForUpdate(@Param("uuid") UUID uuid, @Param("userId") Long userId);
}
