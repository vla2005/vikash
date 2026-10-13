package com.vikash_api.logging;

import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;

@Slf4j
@Configuration(proxyBeanMethods = false)
public class LoggingAsyncConfiguration {
    @Bean public TaskDecorator requestIdTaskDecorator() {
        return task -> {
            String captured = MDC.get("requestId");
            return () -> {
                var previous = MDC.getCopyOfContextMap();
                MDC.clear();
                MDC.put("requestId", captured == null ? UUID.randomUUID().toString() : captured);
                log.info("event=async.start");
                try { task.run(); }
                finally {
                    log.info("event=async.finished");
                    MDC.clear();
                    if (previous != null) MDC.setContextMap(previous);
                }
            };
        };
    }
    // Configurer separado: o Boot 4.1 pode decorá-lo sem substituir a classe que fornece @Bean.
    @Bean public AsyncConfigurer loggingAsyncConfigurer() {
        return new AsyncConfigurer() {
            @Override public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
                return (error, method, parameters) -> SafeDiagnostics.failure(log, "async.failed",
                        method.getDeclaringClass().getSimpleName() + "." + method.getName(), error, 0, true);
            }
        };
    }
}
