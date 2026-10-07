package com.vikash_api.services;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.vikash_api.exceptions.RequestLimitException;

@Service
public class AiUsageService {
    private final Map<Long, Usage> users = new HashMap<>();
    private final int perMinute;
    private final int perDay;
    private final int globalPerDay;
    private final int perUserConcurrent;
    private final int globalConcurrent;
    private final Clock clock;
    private int active;
    private int dailyCount;
    private long dailyExpiresAt;
    private static final int MAX_USERS = 10_000;

    @Autowired
    public AiUsageService(
            @Value("${security.ai.per-minute:5}") int perMinute,
            @Value("${security.ai.per-day:50}") int perDay,
            @Value("${security.ai.global-per-day:500}") int globalPerDay,
            @Value("${security.ai.per-user-concurrent:1}") int perUserConcurrent,
            @Value("${security.ai.global-concurrent:4}") int globalConcurrent) {
        this(perMinute, perDay, globalPerDay, perUserConcurrent, globalConcurrent, Clock.systemUTC());
    }

    AiUsageService(int perMinute, int perDay, int globalPerDay, int perUserConcurrent,
            int globalConcurrent, Clock clock) {
        if (perMinute < 1 || perDay < 1 || globalPerDay < 1 || perUserConcurrent < 1 || globalConcurrent < 1) {
            throw new IllegalArgumentException("Os limites de IA devem ser positivos.");
        }
        this.perMinute = perMinute;
        this.perDay = perDay;
        this.globalPerDay = globalPerDay;
        this.perUserConcurrent = perUserConcurrent;
        this.globalConcurrent = globalConcurrent;
        this.clock = clock;
    }

    public synchronized Permit acquire(Long userId) {
        long now = clock.instant().getEpochSecond();
        users.values().removeIf(usage -> usage.dailyExpiresAt <= now && usage.active == 0);
        if (dailyExpiresAt <= now) { dailyCount = 0; dailyExpiresAt = now + 86400; }
        Usage usage = users.get(userId);
        if (usage == null) {
            if (users.size() >= MAX_USERS) { throw limited(60); }
            usage = new Usage();
            users.put(userId, usage);
        }
        if (usage.dailyExpiresAt <= now) { usage.dailyCount = 0; usage.dailyExpiresAt = now + 86400; }
        if (usage.minuteExpiresAt <= now) { usage.minuteCount = 0; usage.minuteExpiresAt = now + 60; }
        if (dailyCount >= globalPerDay) { throw limited(dailyExpiresAt - now); }
        if (usage.dailyCount >= perDay) { throw limited(usage.dailyExpiresAt - now); }
        if (usage.minuteCount >= perMinute) { throw limited(usage.minuteExpiresAt - now); }
        if (active >= globalConcurrent || usage.active >= perUserConcurrent) { throw limited(5); }
        usage.minuteCount++;
        usage.dailyCount++;
        dailyCount++;
        usage.active++;
        active++;
        return new Permit(usage);
    }

    private RequestLimitException limited(long seconds) {
        return new RequestLimitException("Limite de análises atingido. Aguarde e tente novamente.", seconds);
    }

    // O try-with-resources libera a vaga mesmo se a IA ou a gravação falhar.
    public final class Permit implements AutoCloseable {
        private final Usage usage;
        private boolean closed;
        private Permit(Usage usage) { this.usage = usage; }
        @Override
        public void close() {
            synchronized (AiUsageService.this) {
                if (closed) { return; }
                closed = true;
                usage.active--;
                active--;
            }
        }
    }

    private static class Usage {
        int minuteCount;
        int dailyCount;
        int active;
        long minuteExpiresAt;
        long dailyExpiresAt;
    }
}
