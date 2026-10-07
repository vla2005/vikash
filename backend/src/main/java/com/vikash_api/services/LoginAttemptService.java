package com.vikash_api.services;

import java.time.Clock;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.vikash_api.exceptions.RequestLimitException;

@Service
public class LoginAttemptService {
    private final Map<String, Attempts> attempts = new HashMap<>();
    private final int emailLimit;
    private final int originLimit;
    private final long windowSeconds;
    private final Clock clock;
    private static final int MAX_KEYS = 10_000;

    @Autowired
    public LoginAttemptService(
            @Value("${security.login.email-limit:10}") int emailLimit,
            @Value("${security.login.origin-limit:100}") int originLimit,
            @Value("${security.login.window-seconds:900}") long windowSeconds) {
        this(emailLimit, originLimit, windowSeconds, Clock.systemUTC());
    }

    LoginAttemptService(int emailLimit, int originLimit, long windowSeconds, Clock clock) {
        if (emailLimit < 1 || originLimit < 1 || windowSeconds < 1) {
            throw new IllegalArgumentException("Os limites de login devem ser positivos.");
        }
        this.emailLimit = emailLimit;
        this.originLimit = originLimit;
        this.windowSeconds = windowSeconds;
        this.clock = clock;
    }

    // Conta também tentativas simultâneas e logins válidos, sem depender de uma conta existir.
    public synchronized void check(String email, String origin) {
        long now = clock.instant().getEpochSecond();
        attempts.values().removeIf(value -> value.expiresAt() <= now);
        String emailKey = "email:" + email.trim().toLowerCase(Locale.ROOT);
        String originKey = "origin:" + origin;
        checkLimit(emailKey, emailLimit, now);
        checkLimit(originKey, originLimit, now);
        int newKeys = (attempts.containsKey(emailKey) ? 0 : 1) + (attempts.containsKey(originKey) ? 0 : 1);
        if (attempts.size() + newKeys > MAX_KEYS) {
            throw limited(windowSeconds);
        }
        increment(emailKey, now);
        increment(originKey, now);
    }

    private void checkLimit(String key, int limit, long now) {
        Attempts current = attempts.get(key);
        if (current != null && current.count() >= limit) {
            throw limited(current.expiresAt() - now);
        }
    }

    private void increment(String key, long now) {
        Attempts current = attempts.get(key);
        attempts.put(key, current == null ? new Attempts(1, now + windowSeconds)
                : new Attempts(current.count() + 1, current.expiresAt()));
    }

    private RequestLimitException limited(long seconds) {
        return new RequestLimitException("Muitas tentativas de login. Aguarde e tente novamente.", seconds);
    }

    private record Attempts(int count, long expiresAt) {}
}
