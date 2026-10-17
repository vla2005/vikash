package com.vikash_api.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assistant_messages", uniqueConstraints =
    @UniqueConstraint(name = "uk_assistant_message_client", columnNames = {"conversation_id", "client_id"}))
@Getter @Setter
public class AssistantMessageEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, updatable = false) private UUID uuid;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "conversation_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE) private AssistantConversationEntity conversation;
    @Column(name = "client_id", nullable = false, length = 80, updatable = false) private String clientId;
    @Column(nullable = false, length = 16) private String role;
    @Column(nullable = false, length = 6000) private String content;
    @Column(nullable = false, length = 24) private String status;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    // Proposta ainda não validada. Nenhum destes campos autoriza executar SQL.
    @Column(length = 64) private String catalogVersion;
    @Column(length = 24000) private String proposalJson;
    @Column(length = 64) private String sqlValidationVersion;
    @Column(length = 24000) private String validatedSql;
    @Column(length = 64) private String sqlValidationHash;
    @Column(length = 64) private String sqlRejectionReason;
    private Instant sqlValidatedAt;
    @Column(length = 65536) private String queryResultJson;
    @Column(length = 64) private String queryResultHash;
    @Column(length = 64) private String queryExecutionVersion;
    @Column(length = 64) private String queryFailureReason;
    private UUID queryOwnerUuid;
    private Instant queryExecutedAt;
    @Column(length = 48000) private String presentationJson;
    @Column(length = 64) private String answerVersion;
    @Column(length = 64) private String answerInputHash;
    @Column(length = 64) private String answerOutputHash;
    @Column(length = 64) private String answerFailureReason;
    private Instant answeredAt;
    @Column(length = 12000) private String memoryContextJson;
    @Column(length = 64) private String memoryContextHash;
    private UUID replyUuid;
    private UUID planningToken;
    private Instant planningStartedAt;
}
