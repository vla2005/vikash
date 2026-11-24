package com.vikash_api.assistant;

import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Slf4j
final class AssistantGeminiRequest {
    private AssistantGeminiRequest() {}

    static String generate(RestClient client, String url, String key, Map<String, ?> body) {
        // Leave room for the final HTTP call and the next stage within the chat's request deadline.
        long retryUntil = System.nanoTime() + TimeUnit.SECONDS.toNanos(8);
        for (int attempt = 0; ; attempt++) {
            try {
                return client.post().uri(url).header("x-goog-api-key", key)
                        .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(String.class);
            } catch (RestClientResponseException failure) {
                int status = failure.getStatusCode().value();
                if (attempt >= 2 || status < 502 || status > 504) throw failure;
                long delayMs = (500L << attempt) + ThreadLocalRandom.current().nextLong(150);
                if (System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(delayMs) >= retryUntil) throw failure;
                log.info("event=assistant.gemini.retry providerStatus={} nextAttempt={}", status, attempt + 2);
                try {
                    Thread.sleep(delayMs);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw failure;
                }
            }
        }
    }
}
