package com.vikash_api.repositories;

import com.vikash_api.entities.AssistantMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AssistantMessageRepository extends JpaRepository<AssistantMessageEntity, Long> {
    Optional<AssistantMessageEntity> findByConversationIdAndClientId(Long conversationId, String clientId);
    long countByConversationId(Long conversationId);
    long countByConversationIdAndRoleAndReplyUuidIsNull(Long conversationId, String role);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT m FROM AssistantMessageEntity m JOIN FETCH m.conversation c WHERE m.uuid = :uuid AND c.user.id = :userId")
    Optional<AssistantMessageEntity> findOwnedForUpdate(@org.springframework.data.repository.query.Param("uuid") java.util.UUID uuid,
            @org.springframework.data.repository.query.Param("userId") Long userId);
    Optional<AssistantMessageEntity> findByUuidAndConversationUserId(java.util.UUID uuid, Long userId);
    java.util.List<AssistantMessageEntity> findTop12ByConversationIdAndIdLessThanOrderByIdDesc(Long conversationId, Long id);
    java.util.List<AssistantMessageEntity> findTop100ByConversationIdAndRoleAndIdLessThanOrderByIdAsc(Long conversationId,String role,Long id);
    boolean existsByConversationIdAndStatusInAndPlanningStartedAtAfter(Long conversationId, java.util.Collection<String> statuses, java.time.Instant cutoff);
    boolean existsByConversationIdAndStatusAndPlanningStartedAtAfter(Long conversationId, String status, java.time.Instant cutoff);
}
