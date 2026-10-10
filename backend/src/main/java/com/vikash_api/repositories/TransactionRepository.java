package com.vikash_api.repositories;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Optional;
import java.util.List;

import com.vikash_api.dtos.responses.CategoryExpenseResponse;
import com.vikash_api.dtos.responses.DailyTransactionTotalsResponse;

import com.vikash_api.dtos.responses.TransactionTotalsResponse;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

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
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TransactionEntity t WHERE t.uuid = :uuid AND t.user.id = :userId")
    Optional<TransactionEntity> findOwnedForUpdate(@Param("uuid") UUID uuid, @Param("userId") Long userId);

    @Query("""
        SELECT new com.vikash_api.dtos.responses.DailyTransactionTotalsResponse(
            CAST(t.occurredAt AS LocalDate),
            COALESCE(SUM(CASE WHEN t.type = com.vikash_api.enums.TransactionType.INCOME THEN t.amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN t.type IN (com.vikash_api.enums.TransactionType.EXPENSE,
                com.vikash_api.enums.TransactionType.INVOICE_PAYMENT) THEN t.amount ELSE 0 END), 0)
        )
        FROM TransactionEntity t
        WHERE t.user.id = :userId AND t.account.active = true
            AND t.occurredAt >= :start AND t.occurredAt < :end
            AND t.type IN (com.vikash_api.enums.TransactionType.INCOME,
                com.vikash_api.enums.TransactionType.EXPENSE, com.vikash_api.enums.TransactionType.INVOICE_PAYMENT)
        GROUP BY CAST(t.occurredAt AS LocalDate)
        ORDER BY CAST(t.occurredAt AS LocalDate)
        """)
    List<DailyTransactionTotalsResponse> sumDailyTotalsByUserAndPeriod(@Param("userId") Long userId,
            @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

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


    @Query("""
    SELECT new com.vikash_api.dtos.responses.TransactionTotalsResponse(
        COALESCE(SUM(
            CASE
                WHEN t.type = com.vikash_api.enums.TransactionType.INCOME
                THEN t.amount
                ELSE 0
            END
        ), 0),
        COALESCE(SUM(
            CASE
                WHEN t.type IN (
                    com.vikash_api.enums.TransactionType.EXPENSE,
                    com.vikash_api.enums.TransactionType.INVOICE_PAYMENT
                )
                THEN t.amount
                ELSE 0
            END
        ), 0)
    )
    FROM TransactionEntity t
    WHERE t.user.id = :userId
      AND t.occurredAt >= :start
      AND t.occurredAt < :end
    """)
    TransactionTotalsResponse sumTotalsByUserAndPeriod(
            @Param("userId") Long userId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);




    @Query("""
    SELECT new com.vikash_api.dtos.responses.CategoryExpenseResponse(
        defaultCategory.id,
        customCategory.uuid,
        COALESCE(customCategory.name, defaultCategory.name, 'Sem categoria'),
        COALESCE(customCategory.color, defaultCategory.color, 'gray'),
        COALESCE(customCategory.icon, defaultCategory.icon, 'ellipsis'),
        SUM(t.amount)
    )
    FROM TransactionEntity t
    LEFT JOIN t.defaultCategory defaultCategory
    LEFT JOIN t.customCategory customCategory
    WHERE t.user.id = :userId
      AND t.type = com.vikash_api.enums.TransactionType.EXPENSE
      AND t.occurredAt >= :start
      AND t.occurredAt < :end
    GROUP BY
        defaultCategory.id,
        customCategory.uuid,
        defaultCategory.name,
        customCategory.name,
        defaultCategory.color,
        customCategory.color,
        defaultCategory.icon,
        customCategory.icon
    ORDER BY SUM(t.amount) DESC
    """)
    List<CategoryExpenseResponse> sumExpensesByCategory(
            @Param("userId") Long userId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );
}
