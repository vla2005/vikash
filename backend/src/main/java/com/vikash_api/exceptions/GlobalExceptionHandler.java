package com.vikash_api.exceptions;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.vikash_api.dtos.responses.ErrorResponse;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InvalidAccountException.class)
    public ResponseEntity<ErrorResponse> handleInvalidAccount(InvalidAccountException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Invalid Account", ex.getMessage(), request.getRequestURI(), null);
    }

    @ExceptionHandler(FinancialInstitutionNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleInstitutionNotFound(FinancialInstitutionNotFoundException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.NOT_FOUND, "Institution Not Found", ex.getMessage(), request.getRequestURI(), null);
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleEmailAlreadyExists(EmailAlreadyExistsException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.CONFLICT, "Email Conflict", ex.getMessage(), request.getRequestURI(), null);
    }

    @ExceptionHandler({BadCredentialsException.class, UsernameNotFoundException.class})
    public ResponseEntity<ErrorResponse> handleBadCredentials(Exception ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, "Unauthorized", "Invalid email or password", request.getRequestURI(), null);
    }

    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<ErrorResponse> handleInvalidToken(InvalidTokenException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, "Invalid Token", ex.getMessage(), request.getRequestURI(), null);
    }

    @ExceptionHandler(TokenCompromisedException.class)
    public ResponseEntity<ErrorResponse> handleTokenCompromised(TokenCompromisedException ex, HttpServletRequest request) {
        log.warn("Security compromise detected at URI: {}", request.getRequestURI());
        return buildErrorResponse(HttpStatus.FORBIDDEN, "Security Compromise Detected", ex.getMessage(), request.getRequestURI(), null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        return buildErrorResponse(
                HttpStatus.BAD_REQUEST,
                "Validation Error",
                "One or more fields failed validation",
                request.getRequestURI(),
                errors
        );
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.FORBIDDEN, "Forbidden", "Access denied: insufficient permissions", request.getRequestURI(), null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneralException(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception processing request: {}", request.getRequestURI(), ex);
        return buildErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "An unexpected internal error occurred: " + ex.getMessage(),
                request.getRequestURI(),
                null
        );
    }

    private ResponseEntity<ErrorResponse> buildErrorResponse(
            HttpStatus status,
            String error,
            String message,
            String path,
            Map<String, String> fieldErrors) {

        ErrorResponse response = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(status.value())
                .error(error)
                .message(message)
                .path(path)
                .fieldErrors(fieldErrors)
                .build();

        return ResponseEntity.status(status).body(response);
    }
}
