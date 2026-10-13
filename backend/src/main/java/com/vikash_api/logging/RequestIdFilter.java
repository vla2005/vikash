package com.vikash_api.logging;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {
    public static final String HEADER = "X-Request-Id";
    public static final String ATTRIBUTE = RequestIdFilter.class.getName() + ".id";
    private static final Set<String> METHODS = Set.of("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS");
    private static final Set<String> AREAS = Set.of("auth", "user", "account", "accounts", "category", "categories", "credit-card", "credit-card-invoice", "credit-card-purchase", "transaction", "dashboard", "institutions");

    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var previous = MDC.getCopyOfContextMap();
        String requestId = UUID.randomUUID().toString();
        request.setAttribute(ATTRIBUTE, requestId);
        response.setHeader(HEADER, requestId);
        MDC.clear();
        MDC.put("requestId", requestId);
        long started = System.nanoTime();
        String method = METHODS.contains(request.getMethod()) ? request.getMethod() : "OTHER";
        log.info("event=request.start method={} area={}", method, area(request));
        boolean failed = false;
        try { chain.doFilter(request, response); }
        catch (IOException | ServletException | RuntimeException failure) {
            failed = true;
            SafeDiagnostics.failure(log, "request.failed", "http", failure, SafeDiagnostics.elapsedMs(started), true);
            throw failure;
        } finally {
            log.info("event=request.complete method={} route={} status={} durationMs={} outcome={}", method, route(request),
                    failed ? 500 : response.getStatus(), SafeDiagnostics.elapsedMs(started), failed || response.getStatus() >= 400 ? "failure" : "success");
            MDC.clear();
            if (previous != null) MDC.setContextMap(previous);
        }
    }
    public static String route(HttpServletRequest request) {
        Object template = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        // Só o template do Spring; nunca URI, query string ou path variable recebida do cliente.
        return template instanceof String value && value.length() <= 200 && value.matches("[A-Za-z0-9_/{}/.*-]+") ? value : "UNMAPPED";
    }
    private static String area(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null || !uri.startsWith("/api/")) return "OTHER";
        String value = uri.substring(5).split("/", 2)[0];
        return AREAS.contains(value) ? value : "OTHER";
    }
    public static String currentRoute() {
        var attributes = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
        return attributes instanceof org.springframework.web.context.request.ServletRequestAttributes servlet ? route(servlet.getRequest()) : "BACKGROUND";
    }
}
