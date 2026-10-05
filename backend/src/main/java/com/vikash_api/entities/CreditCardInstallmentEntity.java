package com.vikash_api.entities;

import java.math.BigDecimal;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Index;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "credit_card_installments", uniqueConstraints = {
    @UniqueConstraint(name = "uk_purchase_installment_number", columnNames = {"purchase_id", "installment_number"})
}, indexes = {@Index(name = "idx_installment_invoice", columnList = "credit_card_invoice_id")})
@Getter
@Setter
public class CreditCardInstallmentEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_id", nullable = false)
    private CreditCardPurchaseEntity purchase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_card_invoice_id", nullable = false)
    private CreditCardInvoiceEntity creditCardInvoice;

    @Column(nullable = false)
    private Integer installmentNumber;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @PrePersist
    private void prePersist() {
        if (uuid == null) { uuid = UUID.randomUUID(); }
    }
}
