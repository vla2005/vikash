package com.vikash_api.entities;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.ColumnDefault;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "debts", uniqueConstraints = @UniqueConstraint(name = "uq_debt_user_uuid",
        columnNames = {"user_id", "uuid"}))
@Getter
@Setter
public class DebtEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, updatable = false)
    private UserEntity user;

    @Column(nullable = false, length = 100)
    private String creditor;

    @Column(length = 500)
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private int installmentCount;

    @Column(nullable = false)
    private int initiallyPaidInstallments;

    @Column(nullable = false)
    private LocalDate initialNextDueDate;

    @Column(nullable = false)
    private int paidInstallments;

    @Version
    @Column(nullable = false)
    @ColumnDefault("0")
    private long version;
}
