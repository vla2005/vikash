package com.vikash_api.logging;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Cobertura automática de operações novas, sem serializar argumentos nem resultados. */
@Slf4j
@Aspect
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 100)
public class OperationLoggingAspect {
    @Around("execution(public * com.vikash_api.controllers..*(..)) || execution(public * com.vikash_api.services..*(..)) || execution(public * com.vikash_api.exceptions.GlobalExceptionHandler.*(..)) || (bean(*Repository) && this(org.springframework.data.repository.Repository) && execution(public * *(..)))")
    public Object trace(ProceedingJoinPoint call) throws Throwable {
        String type = call.getSignature().getDeclaringTypeName();
        String operation = call.getSignature().getDeclaringType().getSimpleName() + "." + call.getSignature().getName();
        String layer = type.contains(".controllers.") ? "controller" : type.contains(".services.") ? "service" : type.contains(".exceptions.") ? "error-handler" : "repository";
        long started = System.nanoTime();
        log.info("event=operation.start layer={} operation={}", layer, operation);
        if (layer.equals("error-handler")) {
            for (Object argument : call.getArgs()) {
                if (argument instanceof Throwable error) {
                    SafeDiagnostics.failure(log, "error.handled", operation, error, 0, true);
                    break;
                }
            }
        }
        try {
            Object result = call.proceed();
            log.info("event=operation.complete layer={} operation={} durationMs={}", layer, operation, SafeDiagnostics.elapsedMs(started));
            return result;
        } catch (Throwable failure) {
            SafeDiagnostics.failure(log, "operation.failed", operation, failure, SafeDiagnostics.elapsedMs(started), false);
            throw failure;
        }
    }
}
