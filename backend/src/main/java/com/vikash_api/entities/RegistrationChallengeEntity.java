package com.vikash_api.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

/** Pending proof only: never a login-enabled user or a session. */
@Entity
@Table(name = "registration_challenges", indexes = @Index(name = "idx_registration_expiry", columnList = "expiresAt"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class RegistrationChallengeEntity {
    @Id private UUID id;
    @Column(nullable = false, length = 150) private String email;
    @Column(nullable = false, length = 100) private String name;
    @Column(nullable = false, length = 100) private String passwordHash;
    @Column(nullable = false, length = 64) private String codeHash;
    @Column(nullable = false) private Instant expiresAt;
    @Column(nullable = false) private int attempts;
    private Instant usedAt;
}
