package com.vikash_api.repositories;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import com.vikash_api.entities.VoiceEntryReceiptEntity;
public interface VoiceEntryReceiptRepository extends JpaRepository<VoiceEntryReceiptEntity, Long> {
    Optional<VoiceEntryReceiptEntity> findByUserIdAndRequestId(Long userId, UUID requestId);
}
