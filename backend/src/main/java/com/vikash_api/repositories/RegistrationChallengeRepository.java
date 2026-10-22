package com.vikash_api.repositories;

import com.vikash_api.entities.RegistrationChallengeEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface RegistrationChallengeRepository extends JpaRepository<RegistrationChallengeEntity, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from RegistrationChallengeEntity c where c.id = :id")
    Optional<RegistrationChallengeEntity> findForUpdate(@Param("id") UUID id);
    @Modifying
    @Query("delete from RegistrationChallengeEntity c where c.expiresAt < :now")
    void deleteExpired(@Param("now") Instant now);
}
