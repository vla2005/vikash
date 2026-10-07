package com.vikash_api.services;

import static org.assertj.core.api.Assertions.*;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;
import com.vikash_api.exceptions.RequestLimitException;

class LoginAttemptServiceTest {
    @Test
    void normalizesEmailAndBlocksBeforeAnotherAttempt() {
        var limiter = new LoginAttemptService(2, 100, 60);
        limiter.check(" Pessoa@EXAMPLE.COM ", "1");
        limiter.check("pessoa@example.com", "2");
        assertThatThrownBy(() -> limiter.check("pessoa@example.com", "3"))
                .isInstanceOf(RequestLimitException.class);
        assertThatCode(() -> limiter.check("other@example.com", "3")).doesNotThrowAnyException();
    }

    @Test
    void originLimitAlsoBlocksRandomEmails() {
        var limiter = new LoginAttemptService(10, 2, 60);
        limiter.check("a@example.com", "same");
        limiter.check("b@example.com", "same");
        assertThatThrownBy(() -> limiter.check("c@example.com", "same"))
                .isInstanceOf(RequestLimitException.class);
    }

    @Test
    void expiresCountersAndAllowsNewAttempts() {
        Clock clock = org.mockito.Mockito.mock(Clock.class);
        org.mockito.Mockito.when(clock.instant()).thenReturn(Instant.ofEpochSecond(100),
                Instant.ofEpochSecond(101), Instant.ofEpochSecond(160));
        var limiter = new LoginAttemptService(1, 2, 60, clock);
        limiter.check("a@example.com", "same");
        assertThatThrownBy(() -> limiter.check("a@example.com", "same"))
                .isInstanceOfSatisfying(RequestLimitException.class, ex -> assertThat(ex.getRetryAfterSeconds()).isEqualTo(59));
        assertThatCode(() -> limiter.check("a@example.com", "same")).doesNotThrowAnyException();
    }

    @Test
    void cannotOverflowLimitWithConcurrentAttempts() throws Exception {
        var limiter = new LoginAttemptService(3, 100, 60);
        var start = new CountDownLatch(1);
        var accepted = new AtomicInteger();
        try (var executor = Executors.newFixedThreadPool(12)) {
            for (int i = 0; i < 12; i++) {
                executor.submit(() -> {
                    start.await();
                    try { limiter.check("a@example.com", "same"); accepted.incrementAndGet(); }
                    catch (RequestLimitException ignored) {}
                    return null;
                });
            }
            start.countDown();
            executor.shutdown();
            assertThat(executor.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
        }
        assertThat(accepted.get()).isEqualTo(3);
    }

    @Test
    void doesNotEvictLiveCountersWhenStorageIsFull() {
        var limiter = new LoginAttemptService(1, 10000, 60, Clock.fixed(Instant.ofEpochSecond(100), ZoneOffset.UTC));
        for (int i = 0; i < 9999; i++) { limiter.check(i + "@example.com", "same"); }
        assertThatThrownBy(() -> limiter.check("new@example.com", "same")).isInstanceOf(RequestLimitException.class);
        assertThatThrownBy(() -> limiter.check("0@example.com", "another")).isInstanceOf(RequestLimitException.class);
    }
}
