package com.vikash_api.logging;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.classic.pattern.ThrowableProxyConverter;

/** Protege também stack traces produzidos pelos frameworks no console. */
public class SafeThrowableConverter extends ThrowableProxyConverter {
    @Override public String convert(ILoggingEvent event) {
        var result = new StringBuilder();
        IThrowableProxy cause = event.getThrowableProxy();
        for (int depth = 0; cause != null && depth < 8; depth++, cause = cause.getCause()) {
            // Mensagens e exceções suprimidas podem conter SQL, JSON e credenciais: não são emitidas.
            result.append(depth == 0 ? "" : "Caused by: ").append(cause.getClassName()).append('\n');
            var frames = cause.getStackTraceElementProxyArray();
            if (frames != null) for (int index = 0; index < Math.min(24, frames.length); index++) {
                result.append("    at ").append(frames[index].getStackTraceElement()).append('\n');
            }
        }
        return result.toString();
    }
}
