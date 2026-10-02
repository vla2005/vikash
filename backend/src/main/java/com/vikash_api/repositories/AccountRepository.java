package com.vikash_api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.vikash_api.entities.AccountEntity;

@Repository 
public interface AccountRepository extends JpaRepository<AccountEntity, Long>{

}
