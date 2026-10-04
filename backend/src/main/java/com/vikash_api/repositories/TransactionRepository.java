package com.vikash_api.repositories;

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
            END    
        )
        FROM TransactionEntity t
        JOIN t.account account
        LEFT JOIN account.financialInstitution institution
        LEFT JOIN t.defaultCategory defaultCategory
        LEFT JOIN t.customCategory customCategory
        WHERE t.user.id = :userId
        ORDER BY t.occurredAt DESC, t.id DESC    
    """)
    Slice<TransactionSummaryResponse> findSummariesByUserId(@Param("userId") Long userId, Pageable pageable);
}
