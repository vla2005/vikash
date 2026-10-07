package com.vikash_api.controller;

import com.vikash_api.dtos.requests.LoginRequest;
import com.vikash_api.dtos.requests.RefreshTokenRequest;
import com.vikash_api.dtos.requests.RegisterRequest;
import com.vikash_api.dtos.requests.UpdatePasswordRequest;
import com.vikash_api.dtos.requests.UserRequest;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.dtos.responses.UserResponse;
import com.vikash_api.repositories.RefreshTokenRepository;
import com.vikash_api.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:user-profile;DB_CLOSE_DELAY=-1")
class UserIntegrationTest {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired RefreshTokenRepository refreshTokens;
    @Autowired PasswordEncoder passwordEncoder;
    RestClient client;

    @BeforeEach
    void setUp() {
        refreshTokens.deleteAll();
        users.deleteAll();
        client = RestClient.create("http://localhost:" + port);
    }

    @Test
    void profileUpdatePersistsOnlyTheAuthenticatedUserAndReturnsNoPasswordOrInternalId() {
        AuthResponse auth = register("livia@example.com");
        AuthResponse other = register("outro@example.com");
        String originalHash = users.findByUuid(auth.getUser().getUuid()).orElseThrow().getPassword();
        String body = client.put().uri("/api/user/update").header("Authorization", bearer(auth))
                .contentType(MediaType.APPLICATION_JSON).body(new UserRequest("Lívia Silva", "livia@example.com"))
                .retrieve().body(String.class);

        assertThat(body).contains("Lívia Silva", auth.getUser().getUuid().toString());
        assertThat(body).doesNotContain("\"password\"", "\"id\"");
        assertThat(users.findByUuid(auth.getUser().getUuid()).orElseThrow().getName()).isEqualTo("Lívia Silva");
        assertThat(users.findByUuid(auth.getUser().getUuid()).orElseThrow().getPassword()).isEqualTo(originalHash);
        assertThat(users.findByUuid(other.getUser().getUuid()).orElseThrow().getName()).isEqualTo("Usuário de teste");
        assertThat(client.get().uri("/api/auth/me").header("Authorization", bearer(auth))
                .retrieve().body(UserResponse.class).getName()).isEqualTo("Lívia Silva");
    }

    @Test
    void changingEmailAllowsRefreshAndLoginWithTheUpdatedAddress() {
        AuthResponse auth = register("livia@example.com");
        UserResponse updated = client.put().uri("/api/user/update").header("Authorization", bearer(auth))
                .contentType(MediaType.APPLICATION_JSON).body(new UserRequest("Lívia Silva", " NOVO@example.com ", "Password123!"))
                .retrieve().body(UserResponse.class);
        assertThat(updated.getEmail()).isEqualTo("novo@example.com");
        AuthResponse renewed = refresh(auth);
        assertThat(renewed.getUser().getEmail()).isEqualTo("novo@example.com");
        assertThat(client.get().uri("/api/auth/me").header("Authorization", bearer(renewed))
                .retrieve().body(UserResponse.class).getEmail()).isEqualTo("novo@example.com");
        assertThat(login("novo@example.com", "Password123!").getUser().getUuid()).isEqualTo(auth.getUser().getUuid());
        assertThatThrownBy(() -> login("livia@example.com", "Password123!"))
                .isInstanceOf(HttpClientErrorException.Unauthorized.class);
    }

    @Test
    void duplicateEmailReturnsConflictAndLeavesBothProfilesUntouched() {
        AuthResponse auth = register("livia@example.com");
        register("outro@example.com");
        assertThatThrownBy(() -> client.put().uri("/api/user/update").header("Authorization", bearer(auth))
                .contentType(MediaType.APPLICATION_JSON).body(new UserRequest("Outro nome", " OUTRO@example.com ", "Password123!"))
                .retrieve().toBodilessEntity()).isInstanceOf(HttpClientErrorException.Conflict.class);
        assertThat(users.findByUuid(auth.getUser().getUuid()).orElseThrow().getEmail()).isEqualTo("livia@example.com");
        assertThat(users.findByUuid(auth.getUser().getUuid()).orElseThrow().getName()).isEqualTo("Usuário de teste");
    }

    @Test
    void invalidProfileInputReturnsFieldErrorsAndLeavesTheDatabaseUnchanged() {
        AuthResponse auth = register("livia@example.com");
        String error = client.put().uri("/api/user/update").header("Authorization", bearer(auth))
                .contentType(MediaType.APPLICATION_JSON).body(new UserRequest("   ", "invalid"))
                .exchange((request, response) -> {
                    assertThat(response.getStatusCode().value()).isEqualTo(400);
                    return new String(response.getBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                });
        assertThat(error).contains("\"fieldErrors\"", "\"name\":", "\"email\":");
        assertThat(users.findByUuid(auth.getUser().getUuid()).orElseThrow().getName()).isEqualTo("Usuário de teste");
        assertThat(users.findByUuid(auth.getUser().getUuid()).orElseThrow().getEmail()).isEqualTo("livia@example.com");
    }

    @Test
    void passwordUpdatePersistsAHashAcceptsNewLoginAndRejectsOldPassword() {
        AuthResponse auth = register("livia@example.com");
        AuthResponse other = register("outro@example.com");
        String otherHash = users.findByUuid(other.getUser().getUuid()).orElseThrow().getPassword();
        var result = client.patch().uri("/api/user/update-password").header("Authorization", bearer(auth))
                .contentType(MediaType.APPLICATION_JSON).body(new UpdatePasswordRequest("Password123!", " Nova12345! "))
                .retrieve().toEntity(String.class);
        assertThat(result.getStatusCode().value()).isEqualTo(204);
        assertThat(result.getBody()).isNullOrEmpty();
        String storedHash = users.findByUuid(auth.getUser().getUuid()).orElseThrow().getPassword();
        assertThat(storedHash).isNotEqualTo(" Nova12345! ");
        assertThat(passwordEncoder.matches(" Nova12345! ", storedHash)).isTrue();
        assertThat(login("livia@example.com", " Nova12345! ").getUser().getUuid()).isEqualTo(auth.getUser().getUuid());
        assertThatThrownBy(() -> login("livia@example.com", "Password123!"))
                .isInstanceOf(HttpClientErrorException.Unauthorized.class);
        assertThat(users.findByUuid(other.getUser().getUuid()).orElseThrow().getPassword()).isEqualTo(otherHash);
    }

    @Test
    void incorrectCurrentPasswordReturnsAFieldErrorWithoutChangingPasswordOrEndingSession() {
        AuthResponse auth = register("livia@example.com");
        String originalHash = users.findByUuid(auth.getUser().getUuid()).orElseThrow().getPassword();
        String error = client.patch().uri("/api/user/update-password").header("Authorization", bearer(auth))
                .contentType(MediaType.APPLICATION_JSON).body(new UpdatePasswordRequest("incorrect", "Nova12345!"))
                .exchange((request, response) -> {
                    assertThat(response.getStatusCode().value()).isEqualTo(400);
                    return new String(response.getBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                });
        assertThat(error).contains("\"fieldErrors\":{\"password\":");
        assertThat(users.findByUuid(auth.getUser().getUuid()).orElseThrow().getPassword()).isEqualTo(originalHash);
        assertThat(client.get().uri("/api/auth/me").header("Authorization", bearer(auth))
                .retrieve().toBodilessEntity().getStatusCode().value()).isEqualTo(200);
    }

    @Test
    void unauthenticatedRequestsAndLoggedOutTokensCannotUpdateProfileOrPassword() {
        AuthResponse auth = register("livia@example.com");
        assertUpdateDenied(null);
        client.post().uri("/api/auth/logout").header("Authorization", bearer(auth))
                .retrieve().toBodilessEntity();
        assertUpdateDenied(bearer(auth));
        assertThat(users.findByUuid(auth.getUser().getUuid()).orElseThrow().getName()).isEqualTo("Usuário de teste");
        assertThat(login("livia@example.com", "Password123!").getUser().getUuid()).isEqualTo(auth.getUser().getUuid());
    }

    private void assertUpdateDenied(String authorization) {
        for (HttpMethod method : new HttpMethod[] { HttpMethod.PUT, HttpMethod.PATCH }) {
            String path = method == HttpMethod.PUT ? "/api/user/update" : "/api/user/update-password";
            Object body = method == HttpMethod.PUT ? new UserRequest("Outro nome", "novo@example.com")
                    : new UpdatePasswordRequest("Password123!", "Nova12345!");
            var request = client.method(method).uri(path).contentType(MediaType.APPLICATION_JSON).body(body);
            if (authorization != null) { request.header("Authorization", authorization); }
            int status = request.exchange((sent, response) -> response.getStatusCode().value());
            assertThat(status).isEqualTo(401);
        }
    }

    private AuthResponse register(String email) {
        return client.post().uri("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .body(new RegisterRequest("Usuário de teste", email, "Password123!"))
                .retrieve().body(AuthResponse.class);
    }

    private AuthResponse login(String email, String password) {
        return client.post().uri("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .body(new LoginRequest(email, password)).retrieve().body(AuthResponse.class);
    }

    private AuthResponse refresh(AuthResponse auth) {
        return client.post().uri("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .body(new RefreshTokenRequest(auth.getRefreshToken())).retrieve().body(AuthResponse.class);
    }

    private String bearer(AuthResponse auth) { return "Bearer " + auth.getAccessToken(); }
}
