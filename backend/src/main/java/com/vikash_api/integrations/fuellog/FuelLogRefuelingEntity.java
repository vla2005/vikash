package com.vikash_api.integrations.fuellog;

import java.time.Instant;
import java.util.UUID;
import com.vikash_api.entities.UserEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "fuellog_refuelings", uniqueConstraints = @UniqueConstraint(name = "uk_fuellog_authorization_external",
        columnNames = {"authorization_id", "external_id"}))
@Getter
@Setter
public class FuelLogRefuelingEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false, updatable = false)
    private UserEntity user;
    @Column(name = "authorization_id", nullable = false, updatable = false, length = 100)
    private String authorizationId;
    @Column(name = "external_id", nullable = false, updatable = false, length = 100)
    private String externalId;
    @Column(nullable = false)
    private long version;
    @Column(nullable = false, length = 4096)
    private String canonicalPayload;
    @Column(nullable = false, length = 20)
    private String status;
    // Deliberately no foreign key: a manual financial deletion must leave the receipt intact.
    @Column(nullable = false)
    private UUID financialUuid;
    @Column(nullable = false, length = 30)
    private String financialKind;
    @Column(nullable = false, length = 64)
    private String financialFingerprint;
    @Column(nullable = false)
    private Instant occurredAt;
    @Column(nullable = false, length = 100)
    private String timeZone;
}
