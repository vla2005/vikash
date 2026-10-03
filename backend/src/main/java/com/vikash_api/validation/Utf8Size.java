package com.vikash_api.validation;

import java.lang.annotation.Retention;
import java.lang.annotation.Target;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import static java.lang.annotation.ElementType.*;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Target({ FIELD, PARAMETER, RECORD_COMPONENT })
@Retention(RUNTIME)
@Constraint(validatedBy = Utf8SizeValidator.class)
public @interface Utf8Size {
    int max();
    String message() default "O campo excede o tamanho permitido em UTF-8.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
