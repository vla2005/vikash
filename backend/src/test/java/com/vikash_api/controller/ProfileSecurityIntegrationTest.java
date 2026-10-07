package com.vikash_api.controller;

import com.vikash_api.dtos.requests.RegisterRequest;
import com.vikash_api.dtos.requests.UserRequest;
import com.vikash_api.dtos.requests.UpdatePasswordRequest;
import com.vikash_api.dtos.requests.LoginRequest;
import com.vikash_api.dtos.requests.RefreshTokenRequest;
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
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

    @Test
    void passwordChangeEndsAllOwnSessionsAndOldLinksButPreservesOtherUsers() {
        AuthResponse auth = register();
        AuthResponse second = login("Password123!");
        AuthResponse other = client.post().uri("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .body(new RegisterRequest("Outro usuário", "outro@example.com", "Password123!"))
                .retrieve().body(AuthResponse.class);
        var user = users.findByUuid(auth.getUser().getUuid()).orElseThrow();
        var token = resetTokens.save(PasswordResetTokenEntity.builder().user(user).email(user.getEmail())
                .tokenHash("b".repeat(64)).expiresAt(Instant.now().plusSeconds(900)).build());
        assertThat(changePassword(auth, "Password123!", "NewPassword123!")).isEqualTo(204);
        for (var session : new AuthResponse[] { auth, second }) {
            assertThat(meStatus(session)).isEqualTo(401);
            assertThat(refreshStatus(session)).isIn(401, 403);
        }
        assertThat(meStatus(other)).isEqualTo(200);
        assertThat(resetTokens.findById(token.getId()).orElseThrow().getUsedAt()).isNotNull();
        assertThat(meStatus(login("NewPassword123!"))).isEqualTo(200);
    }

    @Test
    void aConcurrentRefreshCannotSurvivePasswordChange() throws Exception {
        AuthResponse auth = register();
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var changed = executor.submit(() -> { start.await(); return changePassword(auth, "Password123!", "NewPassword123!"); });
            var refreshed = executor.submit(() -> {
                start.await();
                return client.post().uri("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .body(new RefreshTokenRequest(auth.getRefreshToken()))
                        .exchange((request, response) -> response.getStatusCode().value() == 200 ? response.bodyTo(AuthResponse.class) : null);
            });
            start.countDown();
            assertThat(changed.get(10, TimeUnit.SECONDS)).isEqualTo(204);
            var rotated = refreshed.get(10, TimeUnit.SECONDS);
            assertThat(meStatus(auth)).isEqualTo(401);
            if (rotated != null) {
                assertThat(meStatus(rotated)).isEqualTo(401);
                assertThat(refreshStatus(rotated)).isIn(401, 403);
            }
        }
    }

    @Test
    void concurrentPasswordChangesCannotReuseTheOldPassword() throws Exception {
        AuthResponse auth = register();
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> { start.await(); return changePassword(auth, "Password123!", "FirstPassword123!"); });
            var second = executor.submit(() -> { start.await(); return changePassword(auth, "Password123!", "SecondPassword123!"); });
            start.countDown();
            assertThat(java.util.List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS)))
                    .contains(204).allMatch(status -> status == 204 || status == 400 || status == 401)
                    .filteredOn(status -> status == 204).hasSize(1);
        }
    }

    private int changePassword(AuthResponse auth, String password, String newPassword) {
        return client.patch().uri("/api/user/update-password").header("Authorization", bearer(auth))
                .contentType(MediaType.APPLICATION_JSON).body(new UpdatePasswordRequest(password, newPassword))
                .exchange((request, response) -> response.getStatusCode().value());
    }

    private int meStatus(AuthResponse auth) {
        return client.get().uri("/api/auth/me").header("Authorization", bearer(auth))
                .exchange((request, response) -> response.getStatusCode().value());
    }

    private int refreshStatus(AuthResponse auth) {
        return client.post().uri("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .body(new RefreshTokenRequest(auth.getRefreshToken())).exchange((request, response) -> response.getStatusCode().value());
    }

    private AuthResponse login(String password) {
        return client.post().uri("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .body(new LoginRequest("livia@example.com", password)).retrieve().body(AuthResponse.class);
    }

    private AuthResponse register() {
        return client.post().uri("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .body(new RegisterRequest("Lívia", "livia@example.com", "Password123!"))
                .retrieve().body(AuthResponse.class);
    }

    private String bearer(AuthResponse auth) { return "Bearer " + auth.getAccessToken(); }
}
