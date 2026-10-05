package com.vikash_api.repositories;

import com.vikash_api.entities.CreditCardPurchaseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CreditCardPurchaseRepository extends JpaRepository<CreditCardPurchaseEntity, Long> {
    @EntityGraph(attributePaths = {"creditCard.financialInstitution", "defaultCategory", "customCategory"})
    Optional<CreditCardPurchaseEntity> findByUuidAndCreditCardUserId(UUID uuid, Long userId);
}
