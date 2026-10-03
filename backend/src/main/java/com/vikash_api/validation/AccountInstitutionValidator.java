package com.vikash_api.validation;

import com.vikash_api.dtos.requests.AccountRequest;
import com.vikash_api.enums.AccountType;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class AccountInstitutionValidator implements ConstraintValidator<ValidAccountInstitution, AccountRequest> {
    @Override
    public boolean isValid(AccountRequest request, ConstraintValidatorContext context) {
        if (request == null || request.type() != AccountType.CARTEIRA || request.financialInstitutionId() == null) {
            return true;
        }
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                .addPropertyNode("financialInstitutionId").addConstraintViolation();
        return false;
    }
}
