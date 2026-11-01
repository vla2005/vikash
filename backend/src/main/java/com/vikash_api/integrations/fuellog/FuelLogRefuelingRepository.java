package com.vikash_api.integrations.fuellog;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

public interface FuelLogRefuelingRepository extends JpaRepository<FuelLogRefuelingEntity, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<FuelLogRefuelingEntity> findByAuthorizationIdAndUserIdAndExternalId(String authorizationId, Long userId, String externalId);
}
