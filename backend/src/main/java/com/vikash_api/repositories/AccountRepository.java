package com.vikash_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.vikash_api.entities.AccountEntity;

@Repository 
public interface AccountRepository extends JpaRepository<AccountEntity, Long>{
    @EntityGraph(attributePaths = "financialInstitution")
    List<AccountEntity> findByUserIdOrderByBalanceDesc(Long userId);
    Optional<AccountEntity> findByUuidAndUserId(UUID uuid, Long userId);
}
