package com.vikash_api.services;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vikash_api.dtos.requests.CreateAccountRequest;
import com.vikash_api.dtos.responses.AccountResponse;
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
public class CreateAccountService {

    private final AccountRepository accountRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final InstitutionRepository institutionRepository;

    @Transactional 
    public AccountResponse createAccount(CreateAccountRequest request) {
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
        FinancialInstitutionEntity savedInstitution = savedAccount.getFinancialInstitution();
        FinancialInstitutionResponse institutionResponse = savedInstitution == null ? null
                : new FinancialInstitutionResponse(savedInstitution.getId(), savedInstitution.getName(),
                        savedInstitution.getLogoUrl());

        return new AccountResponse(savedAccount.getId(), savedAccount.getDescription(),
                savedAccount.getType(), savedAccount.getBalance(), institutionResponse);
    }
}
