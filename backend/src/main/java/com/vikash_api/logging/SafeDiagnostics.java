package com.vikash_api.logging;

import java.sql.SQLException;
import java.net.SocketTimeoutException;
import java.net.ConnectException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.List;
import org.slf4j.Logger;
import org.springframework.web.client.RestClientResponseException;
import jakarta.mail.MessagingException;

/** Diagnóstico por metadados: nunca lê mensagens, argumentos, corpos, tokens ou entidades. */
public final class SafeDiagnostics {
    private SafeDiagnostics() {}
    public record Details(String errorType, String causeType, String reason, Integer providerStatus, String sqlState, Integer sqlCode) {}

    private static List<Throwable> chain(Throwable error) {
        var chain = new ArrayList<Throwable>();
        var seen = Collections.newSetFromMap(new IdentityHashMap<Throwable, Boolean>());
        while (error != null && chain.size() < 8 && seen.add(error)) {
            chain.add(error);
            Throwable next = error.getCause();
            if (next == null && error instanceof MessagingException mail) next = mail.getNextException();
            error = next;
        }
        return chain;
    }
    public static Details details(Throwable error) {
        var chain = chain(error);
        String reason = "UNEXPECTED_FAILURE";
        Integer status = null;
        String sqlState = null;
        Integer sqlCode = null;
        for (var cause : chain) {
            if (cause instanceof RestClientResponseException response) {
                status = response.getStatusCode().value(); reason = "HTTP_" + status;
            }
            if (cause instanceof SQLException sql) {
                sqlState = sql.getSQLState() != null && sql.getSQLState().matches("[A-Z0-9]{5}") ? sql.getSQLState() : "UNKNOWN";
                sqlCode = sql.getErrorCode(); reason = "DATABASE_FAILURE";
            }
            if (cause instanceof SocketTimeoutException || cause instanceof java.net.http.HttpTimeoutException) reason = "TIMEOUT";
            if (cause instanceof ConnectException) reason = "CONNECTION_FAILED";
            if (cause instanceof java.net.UnknownHostException) reason = "DNS_FAILURE";
            if (cause instanceof javax.net.ssl.SSLException) reason = "TLS_FAILURE";
            if (cause instanceof org.springframework.mail.MailAuthenticationException) reason = "SMTP_AUTH_FAILED";
            if (cause instanceof com.vikash_api.exceptions.RequestLimitException) reason = "REQUEST_LIMIT";
            if (cause instanceof io.jsonwebtoken.ExpiredJwtException) reason = "TOKEN_EXPIRED";
            else if (cause instanceof io.jsonwebtoken.JwtException) reason = "TOKEN_INVALID";
            if (cause instanceof org.springframework.security.core.AuthenticationException) reason = "AUTHENTICATION_FAILED";
            if (cause instanceof org.springframework.security.access.AccessDeniedException) reason = "ACCESS_DENIED";
        }
        return new Details(error == null ? "none" : error.getClass().getSimpleName(),
                chain.isEmpty() ? "none" : chain.getLast().getClass().getSimpleName(), reason, status, sqlState, sqlCode);
    }
    public static void failure(Logger log, String event, String operation, Throwable error, long durationMs, boolean stack) {
        var d = details(error);
        String format = "event={} operation={} errorType={} causeType={} reason={} providerStatus={} sqlState={} sqlCode={} durationMs={}";
        Object[] values = { event, operation, d.errorType(), d.causeType(), d.reason(), d.providerStatus(), d.sqlState(), d.sqlCode(), durationMs };
        if (stack) {
            Object[] withStack = Arrays.copyOf(values, values.length + 1);
            withStack[values.length] = sanitized(error);
            log.info(format, withStack);
        } else log.info(format, values);
    }
    public static RuntimeException sanitized(Throwable error) {
        var chain = chain(error);
        RuntimeException nested = null;
        for (int index = chain.size() - 1; index >= 0; index--) {
            var original = chain.get(index);
            var safe = new LoggedFailure("exceptionType=" + original.getClass().getName(), nested);
            safe.setStackTrace(Arrays.copyOf(original.getStackTrace(), Math.min(original.getStackTrace().length, 24)));
            nested = safe;
        }
        return nested;
    }
    public static long elapsedMs(long start) { return Math.max(0, (System.nanoTime() - start) / 1_000_000); }
    private static final class LoggedFailure extends RuntimeException {
        LoggedFailure(String safeMetadata, Throwable cause) { super(safeMetadata, cause, false, true); }
    }
}
