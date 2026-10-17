package com.vikash_api.repositories;

import com.vikash_api.entities.AssistantConversationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface AssistantConversationRepository extends JpaRepository<AssistantConversationEntity, Long> {
    Optional<AssistantConversationEntity> findByUuidAndUserId(UUID uuid, Long userId);
    Optional<AssistantConversationEntity> findByUserIdAndClientId(Long userId, String clientId);
    long countByUserId(Long userId);
}
