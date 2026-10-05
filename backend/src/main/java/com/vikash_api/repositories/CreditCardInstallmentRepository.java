package com.vikash_api.repositories;

import java.math.BigDecimal;
import java.util.UUID;
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
            installment.installmentNumber, purchase.installmentCount
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
}
