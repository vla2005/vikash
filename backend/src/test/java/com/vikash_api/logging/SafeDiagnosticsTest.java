package com.vikash_api.logging;
import static org.assertj.core.api.Assertions.*;
import java.sql.SQLException;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ThrowableProxy;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;

class SafeDiagnosticsTest {
    @Test void keepsTechnicalCauseAndStackWithoutSqlSecretsOrSuppressedValues() {
        var sql = new SQLException("SQL values ('SECRET_TRANSCRIPTION', 'PRIVATE_EMAIL', 'JWT_VALUE')", "23505", 19);
        sql.addSuppressed(new RuntimeException("PRIVATE_PASSWORD"));
        var original = new IllegalStateException("API_KEY_SECRET", sql);
        var details = SafeDiagnostics.details(original);
        assertThat(details.sqlState()).isEqualTo("23505");
        assertThat(details.sqlCode()).isEqualTo(19);
        assertThat(details.causeType()).isEqualTo("SQLException");
        var safe = SafeDiagnostics.sanitized(original);
        assertThat(safe.getMessage()).contains("IllegalStateException").doesNotContain("API_KEY_SECRET");
        assertThat(safe.getCause().getMessage()).contains("SQLException").doesNotContain("SECRET", "PRIVATE", "JWT");
        assertThat(safe.getCause().getSuppressed()).isEmpty();
        assertThat(safe.getStackTrace()).isNotEmpty();
    }
    @Test void realLogEventIsInfoAndDoesNotKeepOriginalExceptionMessages() {
        var logger = (Logger)LoggerFactory.getLogger("safe-diagnostics-test");
        var capture = new LogCapture(); capture.start(); logger.addAppender(capture);
        try {
            SafeDiagnostics.failure(logger, "test.failed", "Gemini.generateContent", new RuntimeException("SECRET", new SocketTimeoutException("PRIVATE_JSON")), 30_000, true);
            var event = capture.list.getFirst();
            assertThat(event.getLevel()).isEqualTo(Level.INFO);
            assertThat(event.getFormattedMessage()).contains("reason=TIMEOUT", "causeType=SocketTimeoutException", "durationMs=30000");
            assertThat(event.getThrowableProxy().getMessage()).doesNotContain("SECRET");
            assertThat(capture.rendered()).doesNotContain("SECRET", "PRIVATE_JSON");
        } finally { logger.detachAppender(capture); capture.stop(); }
    }
    @Test void providerDiagnosticsExposeStatusButNeverResponseBody() {
        var failure = HttpServerErrorException.create(HttpStatus.SERVICE_UNAVAILABLE, "PRIVATE_PROVIDER_BODY",
                new HttpHeaders(), "API_KEY_SECRET".getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
        assertThat(SafeDiagnostics.details(failure).providerStatus()).isEqualTo(503);
        assertThat(SafeDiagnostics.sanitized(failure).getMessage()).doesNotContain("PRIVATE_PROVIDER_BODY", "API_KEY_SECRET");
    }
    @Test void consoleConverterProtectsRawFrameworkExceptionsToo() {
        var event = new ch.qos.logback.classic.spi.LoggingEvent();
        event.setThrowableProxy(new ThrowableProxy(new RuntimeException("RAW_SECRET_SQL", new RuntimeException("RAW_SECRET_TOKEN"))));
        String rendered = new SafeThrowableConverter().convert(event);
        assertThat(rendered).contains("java.lang.RuntimeException", "SafeDiagnosticsTest").doesNotContain("RAW_SECRET_SQL", "RAW_SECRET_TOKEN");
    }
}
