package com.vikash_api.logging;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.math.BigDecimal;
import java.net.SocketTimeoutException;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.slf4j.LoggerFactory;
import ch.qos.logback.classic.Logger;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.dtos.responses.ErrorResponse;
import com.vikash_api.exceptions.AiAnalysisUnavailableException;
import com.vikash_api.services.AiAnalysisService;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:logging-integration;DB_CLOSE_DELAY=-1")
class LoggingIntegrationTest {
    @LocalServerPort int port;
    @MockitoBean AiAnalysisService ai;
    @Autowired org.springframework.context.ApplicationContext context;
    @Autowired com.vikash_api.repositories.UserRepository users;
    @Autowired com.vikash_api.services.UserService userService;
    RestClient client;
    Logger root;
    LogCapture capture;
    @BeforeEach void setup() {
        client = RestClient.create("http://localhost:" + port);
        root = (Logger)LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
        capture = new LogCapture(); capture.start(); root.addAppender(capture);
    }
    @AfterEach void stop() { root.detachAppender(capture); capture.stop(); }

    private AuthResponse register() {
        return client.post().uri("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", "PRIVATE_NAME", "email", UUID.randomUUID()+"@private.example", "password", "PRIVATE_PASSWORD_123!"))
                .retrieve().body(AuthResponse.class);
    }
    @Test void repositoryCoverageExcludesSpringFactoryMetadata() {
        context.getBean("&userRepository", org.springframework.beans.factory.FactoryBean.class).getObjectType();
        users.count();
        assertThat(capture.rendered()).contains("layer=repository", "operation=CrudRepository.count")
                .doesNotContain("RepositoryFactoryBeanSupport", "getObjectType");
    }
    @Test void servicesAndRepositoriesShareHttpRequestIdAndDoNotSerializeAuthenticationData() {
        AuthResponse auth = register();
        var ids = capture.list.stream().filter(e -> e.getFormattedMessage().contains("AuthController.register"))
                .map(e -> e.getMDCPropertyMap().get("requestId")).distinct().toList();
        assertThat(ids).hasSize(1); UUID.fromString(ids.getFirst());
        assertThat(capture.rendered()).contains("event=operation.start", "event=operation.complete", "layer=repository")
                .doesNotContain("PRIVATE_NAME", "PRIVATE_PASSWORD", "@private.example", auth.getAccessToken(), auth.getRefreshToken());
        var matched = capture.list.stream().filter(e -> e.getMDCPropertyMap().containsKey("requestId")).toList();
        assertThat(matched).allSatisfy(e -> assertThat(e.getMDCPropertyMap().get("requestId")).isEqualTo(ids.getFirst()));
    }
    @Test void voiceProviderFailureIncludesSameIdInHeaderBodyAndSanitizedTechnicalLogs() {
        AuthResponse auth = register();
        when(ai.analyze(any(), any())).thenThrow(new AiAnalysisUnavailableException("PRIVATE_PROVIDER_JSON", new SocketTimeoutException("PRIVATE_KEY")));
        var response = client.post().uri("/api/transaction/create").header("Authorization", "Bearer "+auth.getAccessToken())
                .contentType(MediaType.APPLICATION_JSON).body(Map.of("transcription", "PRIVATE_TRANSCRIPTION_50_REAIS"))
                .exchange((request,result) -> {
                    assertThat(result.getStatusCode().value()).isEqualTo(503);
                    var body = result.bodyTo(ErrorResponse.class);
                    assertThat(body.getRequestId()).isEqualTo(result.getHeaders().getFirst(RequestIdFilter.HEADER));
                    return body;
                });
        UUID.fromString(response.getRequestId());
        var entries = capture.list.stream().filter(e -> response.getRequestId().equals(e.getMDCPropertyMap().get("requestId"))).toList();
        assertThat(entries).anySatisfy(e -> assertThat(e.getFormattedMessage()).contains("reason=TIMEOUT"));
        assertThat(capture.rendered()).contains("event=voice.context.loaded", "event=ai.permit.released")
                .doesNotContain("PRIVATE_TRANSCRIPTION", "PRIVATE_PROVIDER_JSON", "PRIVATE_KEY", auth.getAccessToken());
    }
    @Test void handledValidationFailuresHaveTechnicalDiagnosticsWithoutRejectedBody() {
        AuthResponse auth = register();
        client.post().uri("/api/transaction/create").header("Authorization", "Bearer "+auth.getAccessToken())
                .contentType(MediaType.APPLICATION_JSON).body("{\"transcription\":{\"PRIVATE_REJECTED_VALUE\":true}}")
                .exchange((request,result) -> { assertThat(result.getStatusCode().value()).isEqualTo(400); return null; });
        assertThat(capture.rendered()).contains("event=error.handled", "HttpMessageNotReadableException")
                .doesNotContain("PRIVATE_REJECTED_VALUE", auth.getAccessToken());
    }

    @Test void unauthorizedRequestsAlsoHaveIdAndCorsExposesIt() {
        client.get().uri("/api/user").header("Authorization", "Bearer PRIVATE_INVALID_JWT").header("Origin", "https://frontend.example")
                .exchange((request,result) -> {
                    assertThat(result.getStatusCode().value()).isEqualTo(401);
                    String id = result.getHeaders().getFirst(RequestIdFilter.HEADER); UUID.fromString(id);
                    assertThat(result.getHeaders().getFirst("Access-Control-Expose-Headers")).contains("X-Request-Id");
                    assertThat(result.bodyTo(ErrorResponse.class).getRequestId()).isEqualTo(id);
                    return null;
                });
        assertThat(capture.rendered()).contains("event=authentication.required").doesNotContain("PRIVATE_INVALID_JWT");
    }
    @Test void realAsyncPasswordResetKeepsHttpRequestIdWithoutExposingEmail() throws Exception {
        String id = client.post().uri("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("email", UUID.randomUUID()+"@private-no-user.example"))
                .exchange((request,result) -> result.getHeaders().getFirst(RequestIdFilter.HEADER));
        long deadline = System.nanoTime() + java.util.concurrent.TimeUnit.SECONDS.toNanos(5);
        boolean found = false;
        while (System.nanoTime() < deadline) {
            found = capture.list.stream().anyMatch(e -> e.getFormattedMessage().contains("event=auth.password-reset outcome=not-eligible")
                    && id.equals(e.getMDCPropertyMap().get("requestId")));
            if (found) break;
            Thread.sleep(25);
        }
        assertThat(found).isTrue(); assertThat(capture.rendered()).doesNotContain("@private-no-user.example");
    }
}
