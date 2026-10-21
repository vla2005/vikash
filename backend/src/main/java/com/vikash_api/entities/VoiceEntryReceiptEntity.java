package com.vikash_api.entities;
import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
// Technical receipt only: financial records remain in the existing tables.
@Entity @Table(name = "voice_entry_receipts", uniqueConstraints =
    @UniqueConstraint(name = "uk_voice_receipt_user_request", columnNames = {"user_id", "request_id"}))
@Getter @Setter
public class VoiceEntryReceiptEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(name = "request_id", nullable = false) private UUID requestId;
    @Column(nullable = false, length = 64) private String payloadHash;
    @Column(nullable = false) private Instant createdAt;
}
