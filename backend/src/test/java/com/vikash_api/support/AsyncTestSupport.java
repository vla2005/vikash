package com.vikash_api.support;

import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/** Await completion/commit rather than a fixed delay or the SMTP callback alone. */
public final class AsyncTestSupport {
    private AsyncTestSupport() {}
    public static void awaitIdle(ThreadPoolTaskExecutor executor) throws InterruptedException {
        long deadline = System.nanoTime() + java.util.concurrent.TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            if (executor.getActiveCount() == 0 && executor.getThreadPoolExecutor().getQueue().isEmpty()) return;
            Thread.sleep(10);
        }
        throw new AssertionError("Asynchronous test tasks did not finish");
    }
}
