package com.vikash_api.services;

import com.vikash_api.exceptions.RequestLimitException;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class RegistrationAttemptServiceTest {
    @Test void requestLimitsNormalizeEmailAndRemainSeparateFromLogin() {
        var limiter = new RegistrationAttemptService();
        limiter.request("mail@example.com", "one");
        limiter.request("MAIL@EXAMPLE.COM", "two");
        limiter.request(" mail@example.com ", "three");
        assertThatThrownBy(() -> limiter.request("mail@example.com", "four"))
                .isInstanceOf(RequestLimitException.class);
        limiter.request("other@example.com", "one");
    }
    @Test void rotatingEmailCannotEvadeTheOriginLimit() {
        var limiter = new RegistrationAttemptService();
        for (int i = 0; i < 30; i++) limiter.request("mail" + i + "@example.com", "same-origin");
        assertThatThrownBy(() -> limiter.request("next@example.com", "same-origin"))
                .isInstanceOf(RequestLimitException.class);
    }
}
