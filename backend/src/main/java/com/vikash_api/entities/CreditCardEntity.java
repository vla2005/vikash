package com.vikash_api.entities;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnore;

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
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "credit_cards")
@Getter
@Setter
public class CreditCardEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false)
    private UUID uuid;

    @ManyToOne
    @JoinColumn(nullable = false, name = "user_id")
    @JsonIgnore
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false, name = "financial_institution_id")
    private FinancialInstitutionEntity financialInstitution;

    @Column(nullable = false, length = 100)
    private String description;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal creditLimit;

    @Column(nullable = false, precision = 15, scale = 2, columnDefinition = "numeric(15,2) default 0")
    private BigDecimal unallocatedUsedLimit = BigDecimal.ZERO;

    @Min(value = 1, message = "O dia de fechamento deve estar entre 1 e 31.")
    @Max(value = 31, message = "O dia de fechamento deve estar entre 1 e 31.")
    @Column(nullable = false)
    private Integer closingDay;

    @Min(value = 1, message = "O dia de vencimento deve estar entre 1 e 31.")
    @Max(value = 31, message = "O dia de vencimento deve estar entre 1 e 31.")
    @Column(nullable = false)
    private Integer dueDay;

    @Column(nullable = false)
    private Boolean active = true;

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
