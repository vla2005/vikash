package com.vikash_api.services;

import org.springframework.stereotype.Service;

import com.vikash_api.dtos.requests.CreditCardRequest;
import com.vikash_api.dtos.responses.CreditCardResponse;
import com.vikash_api.dtos.responses.FinancialInstitutionResponse;
import com.vikash_api.entities.CreditCardEntity;
import com.vikash_api.entities.FinancialInstitutionEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.repositories.CreditCardRepository;
import com.vikash_api.repositories.InstitutionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CreditCardService {

    private final AuthenticatedUserService authenticatedUserService;
    private final CreditCardRepository creditCardRepository;
    private final InstitutionRepository institutionRepository;

    public CreditCardResponse create(CreditCardRequest request) {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();

        FinancialInstitutionEntity institution = institutionRepository.findById(request.financialInstitutionId())
            .orElseThrow(() -> new IllegalArgumentException("Instituição financeira não encontrada"));

        CreditCardEntity creditCard = new CreditCardEntity();
        creditCard.setUser(currentUser);
        creditCard.setFinancialInstitution(institution);
        creditCard.setDescription(request.description());
        creditCard.setCreditLimit(request.creditLimit());
        creditCard.setClosingDay(request.closingDay());
        creditCard.setDueDay(request.dueDay());
        creditCard.setActive(true);
        CreditCardEntity savedCard = creditCardRepository.save(creditCard);

        return new CreditCardResponse(
            savedCard.getUuid(),
            savedCard.getDescription(),
            savedCard.getCreditLimit(),
            savedCard.getClosingDay(),
            savedCard.getDueDay(),
            new FinancialInstitutionResponse(institution.getId(), institution.getName(), institution.getLogoUrl())
        );
    }
}
