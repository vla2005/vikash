package com.vikash_api.validation;

import java.lang.annotation.Retention;
import java.lang.annotation.Target;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import static java.lang.annotation.ElementType.TYPE;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Target(TYPE)
@Retention(RUNTIME)
@Constraint(validatedBy = AccountInstitutionValidator.class)
public @interface ValidAccountInstitution {
    String message() default "Carteira não pode ter uma instituição financeira.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
