package com.vikash_api.exceptions;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.vikash_api.dtos.responses.ErrorResponse;
import com.vikash_api.logging.SafeDiagnostics;
import com.vikash_api.logging.RequestIdFilter;
import org.slf4j.MDC;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(org.springframework.web.bind.MissingRequestHeaderException.class)
    public ResponseEntity<ErrorResponse> handleMissingHeader(Exception ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Invalid Request", "Informe os cabeçalhos obrigatórios da solicitação.", request.getRequestURI(), null);
    }

    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleUnsupportedContentType(Exception ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unsupported Media Type", "Formato de envio não suportado para este endpoint.", request.getRequestURI(), null);
    }

    @ExceptionHandler(AssistantAnswerException.class)
    public ResponseEntity<ErrorResponse> handleAssistantAnswer(AssistantAnswerException ex,HttpServletRequest request) {
        log.info("event=assistant.answer.rejected.response reason={}",ex.getReason());
        var status="CONTEXT_LIMIT".equals(ex.getReason())?HttpStatus.UNPROCESSABLE_ENTITY:HttpStatus.SERVICE_UNAVAILABLE;
        var response=buildErrorResponse(status,"Assistant Answer",ex.getMessage(),request.getRequestURI(),null);
        response.getBody().setCode("ASSISTANT_ANSWER_"+ex.getReason());return response;
    }

    @ExceptionHandler(AssistantQueryException.class)
    public ResponseEntity<ErrorResponse> handleAssistantQuery(AssistantQueryException ex,HttpServletRequest request) {
        log.info("event=assistant.query.rejected.response reason={}",ex.getReason());
        HttpStatus status=switch(ex.getReason()) {
            case "COST_LIMIT","RESULT_LIMIT","QUERY_FAILED" -> HttpStatus.UNPROCESSABLE_ENTITY;
            case "TIME_LIMIT" -> HttpStatus.GATEWAY_TIMEOUT;
            default -> HttpStatus.SERVICE_UNAVAILABLE;
        };
        var response=buildErrorResponse(status,"Assistant Query",ex.getMessage(),request.getRequestURI(),null);
        response.getBody().setCode("ASSISTANT_QUERY_"+ex.getReason());return response;
    }

    @ExceptionHandler(AssistantSqlRejectedException.class)
    public ResponseEntity<ErrorResponse> handleAssistantSql(AssistantSqlRejectedException ex, HttpServletRequest request) {
        log.info("event=assistant.sql.rejected.response reason={} sqlExecuted=false", ex.getReason());
        var response = buildErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, "Assistant SQL Rejected", ex.getMessage(), request.getRequestURI(), null);
        response.getBody().setCode("ASSISTANT_SQL_REJECTED"); return response;
    }

    @ExceptionHandler(AssistantPlanningException.class)
    public ResponseEntity<ErrorResponse> handleAssistantPlanning(AssistantPlanningException ex, HttpServletRequest request) {
        SafeDiagnostics.failure(log, "assistant.plan.failed", "assistant.plan", ex, 0, true);
        var response = buildErrorResponse(HttpStatus.SERVICE_UNAVAILABLE, "Assistant Planning Unavailable",
                "Sua pergunta foi salva, mas não foi possível prepará-la agora. Tente enviar novamente.", request.getRequestURI(), null);
        response.getBody().setCode("ASSISTANT_PLANNING_UNAVAILABLE");
        return response;
    }

    @ExceptionHandler(AssistantQuestionException.class)
    public ResponseEntity<ErrorResponse> handleAssistantQuestion(AssistantQuestionException ex, HttpServletRequest request) {
        log.info("event=assistant.question.rejected code={} status={}", ex.getCode(), ex.getStatus().value());
        var response = buildErrorResponse(ex.getStatus(), "Assistant Question", ex.getMessage(), request.getRequestURI(), null);
        response.getBody().setCode(ex.getCode());
        return response;
    }

    @ExceptionHandler(InvalidTransactionUpdateException.class)
    public ResponseEntity<ErrorResponse> handleInvalidTransactionUpdate(InvalidTransactionUpdateException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Invalid Transaction Update", ex.getMessage(),
                request.getRequestURI(), Map.of(ex.getField(), ex.getMessage()));
    }

    @ExceptionHandler(InvalidCreditCardSetupException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCardSetup(InvalidCreditCardSetupException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Invalid Card Setup", ex.getMessage(),
                request.getRequestURI(), Map.of(ex.getField(), ex.getMessage()));
    }

    @ExceptionHandler(RegistrationVerificationException.class)
    public ResponseEntity<ErrorResponse> handleRegistrationVerification(RegistrationVerificationException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Registration Verification", ex.getMessage(), request.getRequestURI(), null);
    }

    @ExceptionHandler(RequestLimitException.class)
    public ResponseEntity<ErrorResponse> handleRequestLimit(RequestLimitException ex, HttpServletRequest request) {
        var response = buildErrorResponse(HttpStatus.TOO_MANY_REQUESTS, "Too Many Requests", ex.getMessage(),
                request.getRequestURI(), null);
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", Long.toString(ex.getRetryAfterSeconds())).body(response.getBody());
    }

    @ExceptionHandler(TaskRejectedException.class)
    public ResponseEntity<ErrorResponse> handleEmailQueueFull(Exception ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.SERVICE_UNAVAILABLE, "Service Unavailable",
                "Não foi possível receber sua solicitação agora. Tente novamente em alguns instantes.",
                request.getRequestURI(), null);
    }

    @ExceptionHandler(PasswordResetException.class)
    public ResponseEntity<ErrorResponse> handlePasswordReset(PasswordResetException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Password Reset Error", ex.getMessage(),
                request.getRequestURI(), Map.of("token", ex.getMessage()));
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

    @ExceptionHandler(VoiceAnalysisValidationException.class)
    public ResponseEntity<ErrorResponse> handleVoiceAnalysisValidation(VoiceAnalysisValidationException ex, HttpServletRequest request) {
        log.info("event=voice.analysis.rejected code={} fields={}", ex.getCode(), ex.getMissingFields());
        var response = buildErrorResponse(HttpStatus.BAD_REQUEST, "Voice Analysis Validation", ex.getMessage(),
                request.getRequestURI(), ex.getFieldErrors());
        response.getBody().setCode(ex.getCode());
        response.getBody().setMissingFields(ex.getMissingFields());
        return response;
    }

    @ExceptionHandler(AiAnalysisUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleAiAnalysisUnavailable(AiAnalysisUnavailableException ex, HttpServletRequest request) {
        SafeDiagnostics.failure(log, "response.ai-unavailable", "voice.analysis", ex, 0, true);
        var response = buildErrorResponse(HttpStatus.SERVICE_UNAVAILABLE, "Voice Analysis Unavailable",
                "Não foi possível analisar agora. Tente novamente em instantes.", request.getRequestURI(), null);
        response.getBody().setCode("VOICE_ANALYSIS_UNAVAILABLE");
        return response;
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
        log.info("event=security.session-reuse outcome=rejected");
        return buildErrorResponse(HttpStatus.FORBIDDEN, "Security Compromise Detected", ex.getMessage(), request.getRequestURI(), null);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ErrorResponse> handleParameterValidation(
            HandlerMethodValidationException ex, HttpServletRequest request) {
        if (ex.isForReturnValue()) {
            return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error",
                    "Não foi possível concluir a solicitação.", request.getRequestURI(), null);
        }
        Map<String, String> errors = new HashMap<>();
        for (var result : ex.getParameterValidationResults()) {
            String field = result.getMethodParameter().getParameterName();
            errors.put(field == null ? "parameter" : field, result.getResolvableErrors().getFirst().getDefaultMessage());
        }
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Validation Error",
                "Confira os parâmetros informados.", request.getRequestURI(), errors);
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
        SafeDiagnostics.failure(log, "response.unexpected-error", "http", ex, 0, true);
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

        log.info("event=response.error route={} status={} error={} invalidFieldCount={}", RequestIdFilter.currentRoute(),
                status.value(), error, fieldErrors == null ? 0 : fieldErrors.size());
        ErrorResponse response = ErrorResponse.builder()
                .timestamp(Instant.now())
                .requestId(MDC.get("requestId"))
                .status(status.value())
                .error(error)
                .message(message)
                .path(path)
                .fieldErrors(fieldErrors)
                .build();

        return ResponseEntity.status(status).body(response);
    }
}
