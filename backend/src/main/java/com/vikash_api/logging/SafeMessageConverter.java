package com.vikash_api.logging;

import java.util.List;
import java.util.regex.Pattern;
import ch.qos.logback.classic.pattern.ClassicConverter;
import ch.qos.logback.classic.spi.ILoggingEvent;

/** Defesa adicional para mensagens de infraestrutura; não substitui evitar payloads nos logs. */
public class SafeMessageConverter extends ClassicConverter {
    private static final List<String> ENV_KEYS = List.of("GEMINI_API_KEY", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "DB_PASSWORD", "SMTP_PASSWORD");
    private static final Pattern JWT = Pattern.compile("(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+");
    private static final Pattern API_KEY = Pattern.compile("AIza[A-Za-z0-9_-]{20,}");
    private static final Pattern EMAIL = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
    private static final Pattern ASSIGNMENTS = Pattern.compile("(?i)(\\b(?:password|newPassword|currentPassword|accessToken|refreshToken|authorization|x-goog-api-key|GEMINI_API_KEY|JWT_ACCESS_SECRET|JWT_REFRESH_SECRET|DB_PASSWORD|SMTP_PASSWORD|JSESSIONID|transcription|amount|balance|creditLimit|availableLimit|description)\\b[\"']?\\s*[:=]\\s*)(?:\"(?:\\\\.|[^\"])*\"|'[^']*'|[^,;\\r\\n)}]+)");

    @Override public String convert(ILoggingEvent event) { return redact(event.getFormattedMessage()); }
    public static String redact(String message) {
        if (message == null) return "";
        for (String name : ENV_KEYS) {
            String secret = System.getenv(name);
            if (secret != null && secret.length() >= 8) message = message.replace(secret, "[REDACTED]");
        }
        message = JWT.matcher(message).replaceAll("[JWT_REDACTED]");
        message = API_KEY.matcher(message).replaceAll("[API_KEY_REDACTED]");
        message = EMAIL.matcher(message).replaceAll("[EMAIL_REDACTED]");
        message = ASSIGNMENTS.matcher(message).replaceAll("$1[REDACTED]");
        return message;
    }
}
