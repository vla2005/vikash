package com.vikash_api.controller;

import static org.assertj.core.api.Assertions.*;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:login-limits;DB_CLOSE_DELAY=-1",
        "security.login.email-limit=2", "security.login.origin-limit=5", "security.login.window-seconds=60" })
class LoginLimitIntegrationTest {
    @LocalServerPort int port;

    @Test
    void returnsUniform429AndDoesNotTrustForwardedOrigin() {
        RestClient client = RestClient.create("http://localhost:" + port);
        for (int i = 0; i < 2; i++) {
            assertThat(login(client, "unknown@example.com", "1.2.3." + i)).isEqualTo(401);
        }
        assertThat(login(client, "UNKNOWN@example.com", "9.9.9.9")).isEqualTo(429);
        for (int i = 0; i < 3; i++) {
            assertThat(login(client, "random" + i + "@example.com", "8.8.8." + i)).isEqualTo(401);
        }
        assertThat(login(client, "another@example.com", "7.7.7.7")).isEqualTo(429);
    }

    private int login(RestClient client, String email, String spoofedIp) {
        return client.post().uri("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", spoofedIp).body(Map.of("email", email, "password", "Wrong123!"))
                .exchange((request, response) -> {
                    if (response.getStatusCode().value() == 429) {
                        assertThat(response.getHeaders().getFirst("Retry-After")).isNotBlank();
                        assertThat(new String(response.getBody().readAllBytes())).contains("Muitas tentativas de login");
                    }
                    return response.getStatusCode().value();
                });
    }
}
