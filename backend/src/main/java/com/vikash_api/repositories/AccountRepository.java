package com.vikash_api.repositories;

import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.vikash_api.entities.AccountEntity;

@Repository 
public interface AccountRepository extends JpaRepository<AccountEntity, Long>{
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM AccountEntity a WHERE a.uuid = :uuid AND a.user.id = :userId")
    Optional<AccountEntity> findOwnedForUpdate(@Param("uuid") UUID uuid,
            @Param("userId") Long userId);
    @EntityGraph(attributePaths = "financialInstitution")
    List<AccountEntity> findByUserIdOrderByBalanceDesc(Long userId);
    Optional<AccountEntity> findByUuidAndUserId(UUID uuid, Long userId);

    Optional<AccountEntity> findByUuid(UUID uuid);
}
