package com.vikash_api.services;

import com.vikash_api.exceptions.RequestLimitException;
import org.springframework.stereotype.Service;
import java.time.Clock;

/** Independent of account existence; bounded maps, shared login limiter implementation. */
@Service
public class RegistrationAttemptService {
    private final LoginAttemptService requests = new LoginAttemptService(3, 30, 900, Clock.systemUTC());
    private final LoginAttemptService confirmations = new LoginAttemptService(5, 60, 900, Clock.systemUTC());

    public void request(String email, String origin) { check(requests, email, origin); }
    public void confirm(String challenge, String origin) { check(confirmations, challenge, origin); }
    private void check(LoginAttemptService limiter, String key, String origin) {
        try { limiter.check(key, origin); }
        catch (RequestLimitException ex) {
            throw new RequestLimitException("Muitas tentativas de cadastro. Aguarde e tente novamente.", ex.getRetryAfterSeconds());
        }
    }
}
