package com.vikash_api.logging;
import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
class LoggingAsyncTest {
    @AfterEach void clear() { MDC.clear(); }
    @Test void propagatesOnlyRequestIdAndRestoresWorkerContextEvenOnFailure() {
        var config = new LoggingAsyncConfiguration(); MDC.put("requestId", "request-one"); MDC.put("token", "SECRET_BAGGAGE");
        var work = config.requestIdTaskDecorator().decorate(() -> {
            assertThat(MDC.get("requestId")).isEqualTo("request-one"); assertThat(MDC.get("token")).isNull();
            throw new IllegalStateException("PRIVATE_TRANSCRIPTION");
        });
        MDC.clear(); MDC.put("requestId", "worker-original");
        assertThatThrownBy(work::run).isInstanceOf(IllegalStateException.class);
        assertThat(MDC.get("requestId")).isEqualTo("worker-original"); assertThat(MDC.get("token")).isNull();
    }
}
