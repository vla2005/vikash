package com.vikash_api.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.Clock;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import com.vikash_api.exceptions.RequestLimitException;

class AiUsageServiceTest {
    @Test
    void limitsPerUserAndGlobalConcurrencyAndReleasesOnFailure() {
        var limits = new AiUsageService(10, 50, 500, 1, 2);
        try (var first = limits.acquire(1L); var second = limits.acquire(2L)) {
            assertThatThrownBy(() -> limits.acquire(1L)).isInstanceOf(RequestLimitException.class);
            assertThatThrownBy(() -> limits.acquire(3L)).isInstanceOf(RequestLimitException.class);
            first.close(); first.close();
            try (var third = limits.acquire(3L)) {
                assertThatThrownBy(() -> limits.acquire(4L)).isInstanceOf(RequestLimitException.class);
            }
        }
        assertThatCode(() -> { try (var next = limits.acquire(1L)) {} }).doesNotThrowAnyException();
        assertThatThrownBy(() -> { try (var next = limits.acquire(2L)) { throw new IllegalStateException("fake failure"); } })
                .isInstanceOf(IllegalStateException.class);
        assertThatCode(() -> { try (var next = limits.acquire(2L)) {} }).doesNotThrowAnyException();
    }

    @Test
    void countsFailedRequestsAndKeepsDailyQuotaAfterMinuteExpires() {
        Clock clock = mock(Clock.class);
        when(clock.instant()).thenReturn(Instant.ofEpochSecond(100));
        var limits = new AiUsageService(1, 2, 10, 1, 4, clock);
        limits.acquire(1L).close();
        assertThatThrownBy(() -> limits.acquire(1L)).isInstanceOf(RequestLimitException.class);
        when(clock.instant()).thenReturn(Instant.ofEpochSecond(160));
        limits.acquire(1L).close();
        when(clock.instant()).thenReturn(Instant.ofEpochSecond(220));
        assertThatThrownBy(() -> limits.acquire(1L)).isInstanceOf(RequestLimitException.class);
        limits.acquire(2L).close();
        when(clock.instant()).thenReturn(Instant.ofEpochSecond(86500));
        assertThatCode(() -> limits.acquire(1L).close()).doesNotThrowAnyException();
    }

    @Test
    void globalBudgetCannotBeBypassedWithDifferentUsers() {
        var limits = new AiUsageService(10, 50, 2, 1, 4);
        limits.acquire(1L).close(); limits.acquire(2L).close();
        assertThatThrownBy(() -> limits.acquire(3L)).isInstanceOf(RequestLimitException.class);
    }

    @Test
    void simultaneousRequestsCannotExceedGlobalSlots() throws Exception {
        var limits = new AiUsageService(10, 50, 500, 1, 3);
        var start = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var attempted = new CountDownLatch(12);
        var accepted = new AtomicInteger();
        try (var executor = Executors.newFixedThreadPool(12)) {
            for (long id = 0; id < 12; id++) {
                long userId = id;
                executor.submit(() -> {
                    start.await();
                    AiUsageService.Permit permit = null;
                    try { permit = limits.acquire(userId); accepted.incrementAndGet(); }
                    catch (RequestLimitException ignored) {}
                    finally { attempted.countDown(); }
                    if (permit != null) { release.await(); permit.close(); }
                    return null;
                });
            }
            start.countDown();
            boolean completed = attempted.await(5, TimeUnit.SECONDS);
            release.countDown();
            assertThat(completed).isTrue();
        }
        assertThat(accepted.get()).isEqualTo(3);
    }
}
