package com.vikash_api.repositories;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.List;

import com.vikash_api.dtos.responses.CategoryExpenseResponse;
import com.vikash_api.dtos.responses.CreditCardInstallmentResponse;
import com.vikash_api.entities.CreditCardInstallmentEntity;
import com.vikash_api.dtos.responses.TransactionSummaryResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CreditCardInstallmentRepository extends JpaRepository<CreditCardInstallmentEntity, Long> {
    @Query("""
        SELECT new com.vikash_api.dtos.responses.TransactionSummaryResponse(
            installment.uuid, purchase.description, installment.amount,
            com.vikash_api.enums.TransactionType.EXPENSE, com.vikash_api.enums.PaymentMethod.CREDIT_CARD,
            purchase.occurredAt, COALESCE(customCategory.name, defaultCategory.name),
            COALESCE(customCategory.color, defaultCategory.color),
            COALESCE(customCategory.icon, defaultCategory.icon), institution.name,
            installment.installmentNumber, purchase.installmentCount, purchase.uuid
        )
        FROM CreditCardInstallmentEntity installment
        JOIN installment.purchase purchase
        JOIN installment.creditCardInvoice invoice
        JOIN invoice.creditCard card
        JOIN card.financialInstitution institution
        LEFT JOIN purchase.defaultCategory defaultCategory
        LEFT JOIN purchase.customCategory customCategory
        WHERE card.user.id = :userId AND purchase.creditCard = card
            AND card.uuid = :cardUuid AND invoice.uuid = :invoiceUuid
        ORDER BY purchase.occurredAt DESC, installment.id DESC
    """)
    Slice<TransactionSummaryResponse> findSummariesByInvoice(@Param("userId") Long userId,
            @Param("cardUuid") UUID cardUuid, @Param("invoiceUuid") UUID invoiceUuid, Pageable pageable);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM CreditCardInstallmentEntity i WHERE i.creditCardInvoice.id = :invoiceId")
    BigDecimal sumByInvoiceId(@Param("invoiceId") Long invoiceId);

    @Query("""
        SELECT new com.vikash_api.dtos.responses.CreditCardInstallmentResponse(
            installment.uuid, installment.installmentNumber, installment.amount,
            invoice.uuid, invoice.referenceMonth, invoice.closingDate, invoice.dueDate, invoice.status
        )
        FROM CreditCardInstallmentEntity installment
        JOIN installment.creditCardInvoice invoice
        WHERE installment.purchase.uuid = :purchaseUuid AND installment.purchase.creditCard.user.id = :userId
        ORDER BY installment.installmentNumber ASC
    """)
    List<CreditCardInstallmentResponse> findDetailsByPurchase(@Param("purchaseUuid") UUID purchaseUuid,
            @Param("userId") Long userId);




    @Query("""
    SELECT new com.vikash_api.dtos.responses.CategoryExpenseResponse(
        defaultCategory.id,
        customCategory.uuid,
        COALESCE(customCategory.name, defaultCategory.name, 'Sem categoria'),
        COALESCE(customCategory.color, defaultCategory.color, 'gray'),
        COALESCE(customCategory.icon, defaultCategory.icon, 'ellipsis'),
        SUM(installment.amount)
    )
    FROM CreditCardInstallmentEntity installment
    JOIN installment.purchase purchase
    JOIN installment.creditCardInvoice invoice
    LEFT JOIN purchase.defaultCategory defaultCategory
    LEFT JOIN purchase.customCategory customCategory
    WHERE purchase.creditCard.user.id = :userId
      AND invoice.referenceMonth = :referenceMonth
    GROUP BY
        defaultCategory.id,
        customCategory.uuid,
        defaultCategory.name,
        customCategory.name,
        defaultCategory.color,
        customCategory.color,
        defaultCategory.icon,
        customCategory.icon
    ORDER BY SUM(installment.amount) DESC
    """)
    List<CategoryExpenseResponse> sumExpensesByCategory(
            @Param("userId") Long userId,
            @Param("referenceMonth") String referenceMonth
    );
}
