package com.vikash_api.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;

@lombok.extern.slf4j.Slf4j
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException) throws IOException {

        log.info("event=authentication.required status=401");
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        String message = (authException != null && authException.getMessage() != null)
                ? authException.getMessage().replace("\"", "\\\"")
                : "Full authentication is required to access this resource";

        String json = String.format(
                "{\"timestamp\":\"%s\",\"status\":401,\"error\":\"Unauthorized\",\"message\":\"%s\",\"path\":\"%s\"}",
                Instant.now(),
                message,
                request.getRequestURI()
        );

        String requestId = org.slf4j.MDC.get("requestId");
        if (requestId != null) json = json.substring(0, json.length() - 1) + ",\"requestId\":\"" + requestId + "\"}";
        response.getWriter().write(json);
    }
}
