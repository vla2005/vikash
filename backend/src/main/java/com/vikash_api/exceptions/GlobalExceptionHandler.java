package com.vikash_api.exceptions;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.vikash_api.dtos.responses.ErrorResponse;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RequestLimitException.class)
    public ResponseEntity<ErrorResponse> handleRequestLimit(RequestLimitException ex, HttpServletRequest request) {
        var response = buildErrorResponse(HttpStatus.TOO_MANY_REQUESTS, "Too Many Requests", ex.getMessage(),
                request.getRequestURI(), null);
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", Long.toString(ex.getRetryAfterSeconds())).body(response.getBody());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParameter(MissingServletRequestParameterException ex, HttpServletRequest request) {
        String message = "Informe o parâmetro " + ex.getParameterName() + ".";
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Invalid Parameter", message, request.getRequestURI(),
                Map.of(ex.getParameterName(), message));
    }

    @ExceptionHandler(TransactionNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleTransactionNotFound(TransactionNotFoundException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.NOT_FOUND, "Transaction Not Found", ex.getMessage(), request.getRequestURI(), null);
    }

    @ExceptionHandler(InvalidTransactionException.class)
    public ResponseEntity<ErrorResponse> handleInvalidTransaction(InvalidTransactionException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Invalid Transaction", ex.getMessage(), request.getRequestURI(), null);
    }

    @ExceptionHandler(CreditCardInvoiceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleInvoiceNotFound(CreditCardInvoiceNotFoundException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.NOT_FOUND, "Invoice Not Found", ex.getMessage(), request.getRequestURI(), null);
    }

    @ExceptionHandler(InvalidCreditCardInvoiceException.class)
    public ResponseEntity<ErrorResponse> handleInvalidInvoice(InvalidCreditCardInvoiceException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Invalid Invoice", ex.getMessage(), request.getRequestURI(), null);
    }

    @ExceptionHandler(CreditCardInvoiceAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateInvoice(CreditCardInvoiceAlreadyExistsException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.CONFLICT, "Invoice Conflict", ex.getMessage(), request.getRequestURI(),
                Map.of("referenceMonth", ex.getMessage()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleInvalidBody(HttpMessageNotReadableException ex, HttpServletRequest request) {
        String message = "Corpo da requisição inválido. Confira o JSON, os tipos dos campos e os valores dos enums.";
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Invalid Request", message,
                request.getRequestURI(), Map.of("body", message));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleInvalidParameter(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        String message = "O parâmetro " + ex.getName() + " está em formato inválido.";
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Invalid Parameter", message,
                request.getRequestURI(), Map.of(ex.getName(), message));
    }

    @ExceptionHandler(CategoryAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateCategory(CategoryAlreadyExistsException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.CONFLICT, "Category Conflict", ex.getMessage(),
                request.getRequestURI(), Map.of("name", ex.getMessage()));
    }

    @ExceptionHandler(CategoryNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleCategoryNotFound(CategoryNotFoundException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.NOT_FOUND, "Category Not Found", ex.getMessage(), request.getRequestURI(), null);
    }

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

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCredentials(InvalidCredentialsException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Invalid Credentials", ex.getMessage(),
                request.getRequestURI(), Map.of("password", ex.getMessage()));
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
                "Confira os campos informados.",
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
                "Não foi possível concluir a solicitação. Tente novamente mais tarde.",
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
