package com.vikash_api.repositories;

import com.vikash_api.entities.PasswordResetTokenEntity;
import com.vikash_api.entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Long> {
    Optional<PasswordResetTokenEntity> findByTokenHash(String tokenHash);

    @Query("SELECT t.user.uuid FROM PasswordResetTokenEntity t WHERE t.tokenHash = :tokenHash")
    Optional<UUID> findUserUuidByTokenHash(@Param("tokenHash") String tokenHash);

    boolean existsByUserAndCreatedAtAfter(UserEntity user, Instant createdAt);

    @Modifying
    @Query("UPDATE PasswordResetTokenEntity t SET t.usedAt = :usedAt WHERE t.user = :user AND t.usedAt IS NULL")
    void markAllUsedByUser(@Param("user") UserEntity user, @Param("usedAt") Instant usedAt);
}
