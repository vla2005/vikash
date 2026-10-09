package com.vikash_api.repositories;

import com.vikash_api.dtos.responses.CreditCardInvoiceAnalysisContext;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.vikash_api.entities.CreditCardInvoiceEntity;
import com.vikash_api.repositories.projections.InvoiceAmountProjection;

@Repository
public interface CreditCardInvoiceRepository extends JpaRepository<CreditCardInvoiceEntity, Long> {
    @Query("""
        SELECT new com.vikash_api.dtos.responses.CreditCardInvoiceAnalysisContext(
            invoice.uuid, card.uuid, invoice.referenceMonth, invoice.closingDate, invoice.dueDate, invoice.status)
        FROM CreditCardInvoiceEntity invoice JOIN invoice.creditCard card
        WHERE card.user.id = :userId
        ORDER BY invoice.dueDate DESC, invoice.id DESC
    """)
    List<CreditCardInvoiceAnalysisContext> findAnalysisContextByUserId(@Param("userId") Long userId);
    boolean existsByUuidAndCreditCardUuidAndCreditCardUserId(UUID uuid, UUID creditCardUuid, Long userId);

    @Query("""
        SELECT new com.vikash_api.repositories.projections.InvoiceAmountProjection(
            card.id, invoice.uuid, invoice.referenceMonth, invoice.closingDate, invoice.dueDate,
            invoice.status, invoice.initialAmount, invoice.initialAmount + COALESCE(SUM(t.amount), 0)
        )
        FROM CreditCardInvoiceEntity invoice
        JOIN invoice.creditCard card
        LEFT JOIN CreditCardInstallmentEntity t ON t.creditCardInvoice = invoice
        WHERE card.user.id = :userId AND card.uuid = :cardUuid
        GROUP BY card.id, invoice.id, invoice.uuid, invoice.referenceMonth,
            invoice.closingDate, invoice.dueDate, invoice.status, invoice.initialAmount
        ORDER BY invoice.dueDate DESC, invoice.id DESC
    """)
    List<InvoiceAmountProjection> findAmountsByCardUuidAndUserId(@Param("cardUuid") UUID cardUuid, @Param("userId") Long userId);

    @Query("""
        SELECT new com.vikash_api.repositories.projections.InvoiceAmountProjection(
            card.id, invoice.uuid, invoice.referenceMonth, invoice.closingDate, invoice.dueDate,
            invoice.status, invoice.initialAmount, invoice.initialAmount + COALESCE(SUM(t.amount), 0)
        )
        FROM CreditCardInvoiceEntity invoice
        JOIN invoice.creditCard card
        LEFT JOIN CreditCardInstallmentEntity t ON t.creditCardInvoice = invoice
        WHERE card.user.id = :userId
        GROUP BY card.id, invoice.id, invoice.uuid, invoice.referenceMonth,
            invoice.closingDate, invoice.dueDate, invoice.status, invoice.initialAmount
        ORDER BY invoice.dueDate DESC, invoice.id DESC
    """)
    List<InvoiceAmountProjection> findAmountsByUserId(@Param("userId") Long userId);

    @EntityGraph(attributePaths = "creditCard")
    List<CreditCardInvoiceEntity> findByCreditCardUserIdOrderByDueDateDescIdDesc(Long userId);

    @EntityGraph(attributePaths = "creditCard")
    List<CreditCardInvoiceEntity> findByCreditCardUuidAndCreditCardUserIdOrderByDueDateDescIdDesc(UUID creditCardUuid, Long userId);

    Optional<CreditCardInvoiceEntity> findByUuidAndCreditCardUserId(UUID uuid, Long userId);

    boolean existsByCreditCardIdAndReferenceMonth(Long creditCardId, String referenceMonth);

    boolean existsByCreditCardIdAndReferenceMonthAndUuidNot(Long creditCardId, String referenceMonth, UUID uuid);

    Optional<CreditCardInvoiceEntity> findByCreditCardIdAndReferenceMonth(Long creditCardId, String referenceMonth);

    @Query("""
        SELECT new com.vikash_api.repositories.projections.InvoiceAmountProjection(
            card.id, invoice.uuid, invoice.referenceMonth, invoice.closingDate, invoice.dueDate,
            invoice.status, invoice.initialAmount, invoice.initialAmount + COALESCE(SUM(t.amount), 0)
        )
        FROM CreditCardInvoiceEntity invoice
        JOIN invoice.creditCard card
        LEFT JOIN CreditCardInstallmentEntity t ON t.creditCardInvoice = invoice
        WHERE card.user.id = :userId AND card.active = true
            AND invoice.status <> com.vikash_api.enums.CreditCardInvoiceStatus.PAID
        GROUP BY card.id, invoice.id, invoice.uuid, invoice.referenceMonth,
            invoice.closingDate, invoice.dueDate, invoice.status, invoice.initialAmount
        ORDER BY invoice.dueDate ASC, invoice.id ASC
    """)
    List<InvoiceAmountProjection> findUnpaidAmountsByUserId(@Param("userId") Long userId);
}
