package com.vikash_api.integrations.fuellog;

import java.time.Instant;
import com.vikash_api.dtos.responses.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(assignableTypes = FuelLogController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class FuelLogExceptionHandler {
    @ExceptionHandler(FuelLogException.class)
    ResponseEntity<ErrorResponse> contract(FuelLogException failure, HttpServletRequest request) {
        return response(failure.status(), failure.code(), failure.getMessage(), request);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class})
    ResponseEntity<ErrorResponse> malformed(Exception failure, HttpServletRequest request) {
        return response(400, "INVALID_REQUEST", "Dados inválidos para o abastecimento.", request);
    }

    @ExceptionHandler({TransientDataAccessException.class, DataAccessResourceFailureException.class, CannotCreateTransactionException.class})
    ResponseEntity<ErrorResponse> unavailable(Exception failure, HttpServletRequest request) {
        return response(503, "SERVICE_UNAVAILABLE", "Serviço temporariamente indisponível. Consulte o abastecimento antes de repetir.", request);
    }

    private ResponseEntity<ErrorResponse> response(int status, String code, String message, HttpServletRequest request) {
        return ResponseEntity.status(status).body(ErrorResponse.builder().timestamp(Instant.now()).status(status)
                .error(HttpStatus.valueOf(status).getReasonPhrase()).message(message).path(request.getRequestURI()).code(code).build());
    }
}
