package com.vikash_api.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import com.vikash_api.entities.DebtEntity;

public interface DebtRepository extends JpaRepository<DebtEntity, Long> {

    List<DebtEntity> findByUserIdOrderByIdDesc(Long userId);

    Optional<DebtEntity> findByUuidAndUserId(UUID uuid, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM DebtEntity d WHERE d.uuid = :uuid AND d.user.id = :userId")
    Optional<DebtEntity> findOwnedForUpdate(@Param("uuid") UUID uuid, @Param("userId") Long userId);
}
