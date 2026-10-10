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
import com.vikash_api.repositories.projections.CreditDashboardInvoiceProjection;
import org.springframework.data.domain.Pageable;

@Repository
public interface CreditCardInvoiceRepository extends JpaRepository<CreditCardInvoiceEntity, Long> {
    @Query("""
        SELECT new com.vikash_api.repositories.projections.CreditDashboardInvoiceProjection(
            invoice.uuid, invoice.referenceMonth, invoice.initialAmount + COALESCE(SUM(part.amount), 0),
            invoice.dueDate, invoice.status, card.uuid, card.lastFourDigits,
            institution.id, institution.name, institution.logoUrl)
        FROM CreditCardInvoiceEntity invoice
        JOIN invoice.creditCard card
        JOIN card.financialInstitution institution
        LEFT JOIN CreditCardInstallmentEntity part ON part.creditCardInvoice = invoice
        WHERE card.user.id = :userId AND invoice.referenceMonth = :referenceMonth
            AND (:cardUuid IS NULL OR card.uuid = :cardUuid)
        GROUP BY invoice.id, invoice.uuid, invoice.referenceMonth, invoice.initialAmount,
            invoice.dueDate, invoice.status, card.uuid, card.lastFourDigits,
            institution.id, institution.name, institution.logoUrl
    """)
    List<CreditDashboardInvoiceProjection> findDashboardMonthInvoices(
            @Param("userId") Long userId, @Param("cardUuid") UUID cardUuid,
            @Param("referenceMonth") String referenceMonth);

    @Query("""
        SELECT new com.vikash_api.repositories.projections.CreditDashboardInvoiceProjection(
            invoice.uuid, invoice.referenceMonth, invoice.initialAmount + COALESCE(SUM(part.amount), 0),
            invoice.dueDate, invoice.status, card.uuid, card.lastFourDigits,
            institution.id, institution.name, institution.logoUrl)
        FROM CreditCardInvoiceEntity invoice
        JOIN invoice.creditCard card
        JOIN card.financialInstitution institution
        LEFT JOIN CreditCardInstallmentEntity part ON part.creditCardInvoice = invoice
        WHERE card.user.id = :userId AND invoice.status <> com.vikash_api.enums.CreditCardInvoiceStatus.PAID
            AND (:cardUuid IS NULL OR card.uuid = :cardUuid)
        GROUP BY invoice.id, invoice.uuid, invoice.referenceMonth, invoice.initialAmount,
            invoice.dueDate, invoice.status, card.uuid, card.lastFourDigits,
            institution.id, institution.name, institution.logoUrl
        HAVING invoice.initialAmount + COALESCE(SUM(part.amount), 0) > 0
        ORDER BY invoice.dueDate, invoice.id
    """)
    List<CreditDashboardInvoiceProjection> findDashboardPendingInvoices(
            @Param("userId") Long userId, @Param("cardUuid") UUID cardUuid, Pageable pageable);

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
