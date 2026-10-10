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
import java.util.List;
import java.time.LocalDateTime;
import org.springframework.data.domain.Pageable;
import com.vikash_api.dtos.responses.CategoryExpenseResponse;
import com.vikash_api.repositories.projections.CreditMonthlyPurchasesProjection;

@Repository
public interface CreditCardPurchaseRepository extends JpaRepository<CreditCardPurchaseEntity, Long> {
    @Query("""
        SELECT new com.vikash_api.repositories.projections.CreditMonthlyPurchasesProjection(
            YEAR(p.occurredAt), MONTH(p.occurredAt), SUM(p.amount), COUNT(p))
        FROM CreditCardPurchaseEntity p
        WHERE p.creditCard.user.id = :userId
            AND (:cardUuid IS NULL OR p.creditCard.uuid = :cardUuid)
            AND p.occurredAt >= :start AND p.occurredAt < :end
        GROUP BY YEAR(p.occurredAt), MONTH(p.occurredAt)
        ORDER BY YEAR(p.occurredAt), MONTH(p.occurredAt)
    """)
    List<CreditMonthlyPurchasesProjection> sumMonthlyPurchases(
            @Param("userId") Long userId, @Param("cardUuid") UUID cardUuid,
            @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("""
        SELECT new com.vikash_api.dtos.responses.CategoryExpenseResponse(
            defaults.id, custom.uuid,
            COALESCE(custom.name, defaults.name, 'Sem categoria'),
            COALESCE(custom.color, defaults.color, 'gray'),
            COALESCE(custom.icon, defaults.icon, 'ellipsis'), SUM(p.amount))
        FROM CreditCardPurchaseEntity p
        LEFT JOIN p.defaultCategory defaults
        LEFT JOIN p.customCategory custom
        WHERE p.creditCard.user.id = :userId
            AND (:cardUuid IS NULL OR p.creditCard.uuid = :cardUuid)
            AND p.occurredAt >= :start AND p.occurredAt < :end
        GROUP BY defaults.id, custom.uuid, defaults.name, custom.name,
            defaults.color, custom.color, defaults.icon, custom.icon
        ORDER BY SUM(p.amount) DESC
    """)
    List<CategoryExpenseResponse> sumPurchasesByCategory(
            @Param("userId") Long userId, @Param("cardUuid") UUID cardUuid,
            @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @EntityGraph(attributePaths = {"creditCard.financialInstitution", "defaultCategory", "customCategory"})
    @Query("""
        SELECT p FROM CreditCardPurchaseEntity p
        WHERE p.creditCard.user.id = :userId
            AND (:cardUuid IS NULL OR p.creditCard.uuid = :cardUuid)
        ORDER BY p.occurredAt DESC, p.id DESC
    """)
    List<CreditCardPurchaseEntity> findRecentPurchases(
            @Param("userId") Long userId, @Param("cardUuid") UUID cardUuid, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM CreditCardPurchaseEntity p WHERE p.uuid = :uuid AND p.creditCard.id IN (SELECT c.id FROM CreditCardEntity c WHERE c.user.id = :userId)")
    Optional<CreditCardPurchaseEntity> findOwnedForUpdate(@Param("uuid") UUID uuid, @Param("userId") Long userId);

    @EntityGraph(attributePaths = {"creditCard.financialInstitution", "defaultCategory", "customCategory"})
    Optional<CreditCardPurchaseEntity> findByUuidAndCreditCardUserId(UUID uuid, Long userId);
}
