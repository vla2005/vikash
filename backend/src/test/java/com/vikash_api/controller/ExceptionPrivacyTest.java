package com.vikash_api.controller;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.slf4j.LoggerFactory;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import com.vikash_api.exceptions.GlobalExceptionHandler;
import com.vikash_api.exceptions.InvalidCredentialsException;
import com.vikash_api.exceptions.CategoryAlreadyExistsException;
import com.vikash_api.exceptions.RequestLimitException;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.core.read.ListAppender;

class ExceptionPrivacyTest {
    private final FailureController controller = new FailureController();
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    static Stream<String> privateDetails() {
        return Stream.of("SQL insert into private_users(password_hash) values ('SECRET-MARKER')",
                "C:/private/keys/server-signing.key", "smtp_password=SECRET-MARKER", null);
    }

    @ParameterizedTest
    @MethodSource("privateDetails")
    void unexpectedErrorsNeverReturnInternalDetails(String details) throws Exception {
        controller.failure = new IllegalStateException(details, new RuntimeException("NESTED-SECRET"));
        var result = mvc.perform(get("/test/unexpected")).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Não foi possível concluir a solicitação. Tente novamente mais tarde."))
                .andExpect(jsonPath("$.path").value("/test/unexpected"))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist()).andReturn();
        String body = result.getResponse().getContentAsString();
        assertThat(body).doesNotContain("SECRET", "private_users", "server-signing.key", "smtp_password", "IllegalStateException");
    }

    @Test
    void operatorLogsStillContainTheExceptionForDiagnosis() throws Exception {
        var logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        var appender = new ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();
        appender.start(); logger.addAppender(appender);
        try {
            controller.failure = new IllegalStateException("server-only-diagnostic");
            mvc.perform(get("/test/unexpected")).andExpect(status().isInternalServerError());
            assertThat(appender.list).anySatisfy(event -> {
                assertThat(event.getFormattedMessage()).contains("/test/unexpected");
                assertThat(event.getThrowableProxy().getMessage()).isEqualTo("server-only-diagnostic");
            });
        } finally { logger.detachAppender(appender); appender.stop(); }
    }

    @Test
    void expectedFieldConflictAndRateErrorsKeepTheirContracts() throws Exception {
        mvc.perform(get("/test/password")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password").value("Senha atual incorreta."));
        mvc.perform(get("/test/conflict")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors.name").value("Categoria já existe."));
        mvc.perform(get("/test/limit")).andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "60"));
    }

    @RestController
    static class FailureController {
        RuntimeException failure;
        @GetMapping("/test/unexpected") void unexpected() { throw failure; }
        @GetMapping("/test/password") void password() { throw new InvalidCredentialsException("Senha atual incorreta."); }
        @GetMapping("/test/conflict") void conflict() { throw new CategoryAlreadyExistsException("Categoria já existe."); }
        @GetMapping("/test/limit") void limit() { throw new RequestLimitException("Aguarde.", 60); }
    }
}
