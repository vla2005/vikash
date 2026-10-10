package com.vikash_api.repositories;

import com.vikash_api.entities.CreditCardPurchaseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CreditCardPurchaseRepository extends JpaRepository<CreditCardPurchaseEntity, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM CreditCardPurchaseEntity p WHERE p.uuid = :uuid AND p.creditCard.id IN (SELECT c.id FROM CreditCardEntity c WHERE c.user.id = :userId)")
    Optional<CreditCardPurchaseEntity> findOwnedForUpdate(@Param("uuid") UUID uuid, @Param("userId") Long userId);

    @EntityGraph(attributePaths = {"creditCard.financialInstitution", "defaultCategory", "customCategory"})
    Optional<CreditCardPurchaseEntity> findByUuidAndCreditCardUserId(UUID uuid, Long userId);
}
