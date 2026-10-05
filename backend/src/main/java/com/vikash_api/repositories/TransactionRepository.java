package com.vikash_api.repositories;

import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.vikash_api.dtos.responses.TransactionSummaryResponse;
import com.vikash_api.entities.TransactionEntity;

@Repository
public interface TransactionRepository extends JpaRepository<TransactionEntity, Long> {
    @EntityGraph(attributePaths = {"account.financialInstitution", "destinationAccount.financialInstitution",
            "defaultCategory", "customCategory", "creditCardInvoice.creditCard.financialInstitution"})
    Optional<TransactionEntity> findByUuidAndUserId(UUID uuid, Long userId);

    @Query("""
        SELECT new com.vikash_api.dtos.responses.TransactionSummaryResponse(
            t.uuid, t.description, t.amount, t.type, t.paymentMethod, t.occurredAt,
            COALESCE(customCategory.name, defaultCategory.name),
            COALESCE(customCategory.color, defaultCategory.color),
            COALESCE(customCategory.icon, defaultCategory.icon),
            CASE
                WHEN account.uuid = :accountUuid THEN
                    CASE WHEN account.type = com.vikash_api.enums.AccountType.CARTEIRA THEN 'Carteira' ELSE institution.name END
                ELSE
                    CASE WHEN destination.type = com.vikash_api.enums.AccountType.CARTEIRA THEN 'Carteira' ELSE destinationInstitution.name END
            END, 1, 1, null
        )
        FROM TransactionEntity t
        LEFT JOIN t.account account
        LEFT JOIN t.destinationAccount destination
        LEFT JOIN account.financialInstitution institution
        LEFT JOIN destination.financialInstitution destinationInstitution
        LEFT JOIN t.defaultCategory defaultCategory
        LEFT JOIN t.customCategory customCategory
        WHERE t.user.id = :userId AND t.paymentMethod <> com.vikash_api.enums.PaymentMethod.CREDIT_CARD AND (account.uuid = :accountUuid OR destination.uuid = :accountUuid)
        ORDER BY t.occurredAt DESC, t.id DESC
    """)
    Slice<TransactionSummaryResponse> findSummariesByAccount(@Param("userId") Long userId,
            @Param("accountUuid") UUID accountUuid, Pageable pageable);



    @Query("""
        SELECT new com.vikash_api.dtos.responses.TransactionSummaryResponse(
            t.uuid,
            t.description,
            t.amount,
            t.type,
            t.paymentMethod,
            t.occurredAt,
            COALESCE(customCategory.name, defaultCategory.name),
            COALESCE(customCategory.color, defaultCategory.color),
            COALESCE(customCategory.icon, defaultCategory.icon),
            CASE
                WHEN account.type = com.vikash_api.enums.AccountType.CARTEIRA
                    THEN 'Carteira'
                ELSE institution.name
            END, 1, 1, null
        )
        FROM TransactionEntity t
        LEFT JOIN t.account account
        LEFT JOIN account.financialInstitution institution
        LEFT JOIN t.defaultCategory defaultCategory
        LEFT JOIN t.customCategory customCategory
        WHERE t.user.id = :userId
        ORDER BY t.occurredAt DESC, t.id DESC    
    """)
    Slice<TransactionSummaryResponse> findSummariesByUserId(@Param("userId") Long userId, Pageable pageable);
}
