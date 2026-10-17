package com.vikash_api.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assistant_conversations", uniqueConstraints =
    @UniqueConstraint(name = "uk_assistant_conversation_client", columnNames = {"user_id", "client_id"}))
@org.hibernate.annotations.DynamicUpdate
@Getter @Setter
public class AssistantConversationEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, updatable = false) private UUID uuid;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE) private UserEntity user;
    @Column(name = "client_id", nullable = false, length = 80, updatable = false) private String clientId;
    @Column(nullable = false, length = 64) private String title;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;
    @Column(length = 12000) private String memoryJson;
    @Column(length = 64) private String memoryHash;
    private Instant memoryUpdatedAt;

}
