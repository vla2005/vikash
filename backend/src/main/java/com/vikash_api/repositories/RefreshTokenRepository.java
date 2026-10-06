package com.vikash_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.vikash_api.entities.RefreshTokenEntity;
import com.vikash_api.entities.UserEntity;

import java.util.Optional;
import java.util.UUID;
import java.time.Instant;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshTokenEntity, Long> {

    Optional<RefreshTokenEntity> findByTokenHash(String tokenHash);

    boolean existsByFamilyIdAndUser_UuidAndRevokedFalseAndExpiresAtAfter(
            String familyId, UUID userUuid, Instant now);

    @Modifying
    @Query("UPDATE RefreshTokenEntity r SET r.revoked = true WHERE r.familyId = :familyId")
    void revokeAllByFamilyId(@Param("familyId") String familyId);

    @Modifying
    @Query("UPDATE RefreshTokenEntity r SET r.revoked = true WHERE r.user = :user")
    void revokeAllByUser(@Param("user") UserEntity user);
}
