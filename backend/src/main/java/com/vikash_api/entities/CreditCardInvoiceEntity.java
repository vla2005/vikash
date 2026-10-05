package com.vikash_api.entities;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.vikash_api.enums.CreditCardInvoiceStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "credit_card_invoices", uniqueConstraints = {
    @UniqueConstraint(name = "uk_credit_card_invoice_reference_month", columnNames = { "credit_card_id", "reference_month" })
})
@Getter
@Setter
public class CreditCardInvoiceEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false, name = "credit_card_id")
    private CreditCardEntity creditCard;

    @Pattern(regexp = "[0-9]{4}-(0[1-9]|1[0-2])", message = "O mês de referência deve estar no formato AAAA-MM.")
    @Column(nullable = false, name = "reference_month", length = 7)
    private String referenceMonth;

    @Column(nullable = false)
    private LocalDate closingDate;

    @Column(nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CreditCardInvoiceStatus status = CreditCardInvoiceStatus.OPEN;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    private void prePersist() {
        if (uuid == null) {
            uuid = UUID.randomUUID();
        }
    }
}
