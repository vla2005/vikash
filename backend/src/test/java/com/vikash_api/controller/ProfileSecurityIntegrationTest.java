package com.vikash_api.controller;

import com.vikash_api.dtos.requests.RegisterRequest;
import com.vikash_api.dtos.requests.UserRequest;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.entities.PasswordResetTokenEntity;
import com.vikash_api.repositories.PasswordResetTokenRepository;
import com.vikash_api.repositories.RefreshTokenRepository;
import com.vikash_api.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import java.time.Instant;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:profile-security;DB_CLOSE_DELAY=-1")
class ProfileSecurityIntegrationTest {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired RefreshTokenRepository refreshTokens;
    @Autowired PasswordResetTokenRepository resetTokens;
    RestClient client;

    @BeforeEach
    void setUp() {
        resetTokens.deleteAll();
        refreshTokens.deleteAll();
        users.deleteAll();
        client = RestClient.create("http://localhost:" + port);
    }

    @Test
    void aBearerAloneOrWrongPasswordCannotChangeTheRecoveryAddress() {
        AuthResponse auth = register();
        for (String password : new String[] { null, "", "incorrect" }) {
            String error = client.put().uri("/api/user/update").header("Authorization", bearer(auth))
                    .contentType(MediaType.APPLICATION_JSON).body(new UserRequest("Outro nome", "novo@example.com", password))
                    .exchange((request, response) -> {
                        assertThat(response.getStatusCode().value()).isEqualTo(400);
                        return new String(response.getBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                    });
            assertThat(error).contains("\"password\":");
            var user = users.findByUuid(auth.getUser().getUuid()).orElseThrow();
            assertThat(user.getEmail()).isEqualTo("livia@example.com");
            assertThat(user.getName()).isEqualTo("Lívia");
        }
    }

    @Test
    void aUnicodeLookalikeAddressAlsoRequiresReauthentication() {
        AuthResponse auth = register();
        String error = client.put().uri("/api/user/update").header("Authorization", bearer(auth))
                .contentType(MediaType.APPLICATION_JSON).body(new UserRequest("Lívia", "lıvia@example.com"))
                .exchange((request, response) -> {
                    assertThat(response.getStatusCode().value()).isEqualTo(400);
                    return new String(response.getBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                });
        assertThat(error).contains("\"password\":");
        assertThat(users.findByUuid(auth.getUser().getUuid()).orElseThrow().getEmail()).isEqualTo("livia@example.com");
    }

    @Test
    void oversizedPasswordsReturnAFieldErrorBeforeBcrypt() {
        AuthResponse auth = register();
        for (String password : new String[] { "a".repeat(73), "á".repeat(37) }) {
            String error = client.put().uri("/api/user/update").header("Authorization", bearer(auth))
                    .contentType(MediaType.APPLICATION_JSON).body(new UserRequest("Lívia", "novo@example.com", password))
                    .exchange((request, response) -> {
                        assertThat(response.getStatusCode().value()).isEqualTo(400);
                        return new String(response.getBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                    });
            assertThat(error).contains("\"password\":");
        }
    }

    @Test
    void changingEmailInvalidatesOldRecoveryLinks() {
        AuthResponse auth = register();
        var user = users.findByUuid(auth.getUser().getUuid()).orElseThrow();
        var token = resetTokens.save(PasswordResetTokenEntity.builder().user(user).email(user.getEmail())
                .tokenHash("a".repeat(64)).expiresAt(Instant.now().plusSeconds(900)).build());
        assertThat(update(auth, "novo@example.com", "Password123!")).isEqualTo(200);
        assertThat(resetTokens.findById(token.getId()).orElseThrow().getUsedAt()).isNotNull();
        assertThat(users.findByUuid(user.getUuid()).orElseThrow().getEmail()).isEqualTo("novo@example.com");
    }

    private int update(AuthResponse auth, String email, String password) {
        return client.put().uri("/api/user/update").header("Authorization", bearer(auth))
                .contentType(MediaType.APPLICATION_JSON).body(new UserRequest("Lívia", email, password))
                .exchange((request, response) -> response.getStatusCode().value());
    }

    private AuthResponse register() {
        return client.post().uri("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .body(new RegisterRequest("Lívia", "livia@example.com", "Password123!"))
                .retrieve().body(AuthResponse.class);
    }

    private String bearer(AuthResponse auth) { return "Bearer " + auth.getAccessToken(); }
}
