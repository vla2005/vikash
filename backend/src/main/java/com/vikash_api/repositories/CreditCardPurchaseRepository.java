package com.vikash_api.repositories;

import com.vikash_api.entities.CreditCardPurchaseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CreditCardPurchaseRepository extends JpaRepository<CreditCardPurchaseEntity, Long> {
}
