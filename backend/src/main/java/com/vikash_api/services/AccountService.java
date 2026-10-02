package com.vikash_api.services;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vikash_api.dtos.requests.AccountRequest;
import com.vikash_api.dtos.responses.AccountResponse;
import com.vikash_api.dtos.responses.AllAccountsResponse;
import com.vikash_api.dtos.responses.FinancialInstitutionResponse;
import com.vikash_api.entities.AccountEntity;
import com.vikash_api.entities.FinancialInstitutionEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.enums.AccountType;
import com.vikash_api.exceptions.InvalidAccountException;
import com.vikash_api.exceptions.FinancialInstitutionNotFoundException;
import com.vikash_api.repositories.AccountRepository;
import com.vikash_api.repositories.InstitutionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor 
public class AccountService {

    private final AccountRepository accountRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final InstitutionRepository institutionRepository;

    @Transactional 
    public AccountResponse create(AccountRequest request) {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        if (request.type() == null) {
            throw new InvalidAccountException("O tipo da conta é obrigatório.");
        }
        if (request.type() == AccountType.CARTEIRA && request.financialInstitutionId() != null) {
            throw new InvalidAccountException("Carteira não pode ter uma instituição financeira.");
        }

        FinancialInstitutionEntity institution = null;
        if (request.financialInstitutionId() != null) {
            institution = institutionRepository.findById(request.financialInstitutionId())
                    .orElseThrow(() -> new FinancialInstitutionNotFoundException(
                            "Instituição financeira não encontrada."));
        }

        AccountEntity accountEntity = new AccountEntity();
        accountEntity.setUser(currentUser);
        accountEntity.setType(request.type());
        accountEntity.setFinancialInstitution(institution);
        accountEntity.setDescription(request.description());
        accountEntity.setBalance(request.balance() != null ? request.balance() : BigDecimal.ZERO);
        accountEntity.setActive(true);
        AccountEntity savedAccount = accountRepository.save(accountEntity);
        return toResponse(savedAccount);
    }

    @Transactional(readOnly = true)
    public AllAccountsResponse get() {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        return new AllAccountsResponse(accountRepository.findByUserIdOrderByBalanceDesc(currentUser.getId()).stream()
                .map(this::toResponse)
                .toList());
    }

    @Transactional
    public AccountResponse update(UUID uuid, AccountRequest request) {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        AccountEntity accountEntity = accountRepository.findByUuidAndUserId(uuid, currentUser.getId())
                .orElseThrow(() -> new InvalidAccountException("Conta não encontrada."));

        if (request.type() == null) {
            throw new InvalidAccountException("O tipo da conta é obrigatório.");
        }
        if (request.type() == AccountType.CARTEIRA && request.financialInstitutionId() != null) {
            throw new InvalidAccountException("Carteira não pode ter uma instituição financeira.");
        }

        FinancialInstitutionEntity institution = null;
        if (request.financialInstitutionId() != null) {
            institution = institutionRepository.findById(request.financialInstitutionId())
                    .orElseThrow(() -> new FinancialInstitutionNotFoundException(
                            "Instituição financeira não encontrada."));
        }

        accountEntity.setType(request.type());
        accountEntity.setFinancialInstitution(institution);
        accountEntity.setDescription(request.description());
        accountEntity.setBalance(request.balance() != null ? request.balance() : BigDecimal.ZERO);
        AccountEntity updatedAccount = accountRepository.save(accountEntity);
        return toResponse(updatedAccount);
    }

    private AccountResponse toResponse(AccountEntity account) {
        FinancialInstitutionEntity savedInstitution = account.getFinancialInstitution();
        FinancialInstitutionResponse institutionResponse = savedInstitution == null ? null
                : new FinancialInstitutionResponse(savedInstitution.getId(), savedInstitution.getName(),
                        savedInstitution.getLogoUrl());

        return new AccountResponse(account.getUuid(), account.getDescription(),
                account.getType(), account.getBalance(), institutionResponse);
    }
}
