package com.vikash_api.controller;

import com.vikash_api.dtos.requests.LoginRequest;
import com.vikash_api.dtos.requests.RefreshTokenRequest;
import com.vikash_api.dtos.requests.RegisterRequest;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.dtos.requests.AccountRequest;
import com.vikash_api.dtos.responses.AccountResponse;
import com.vikash_api.enums.AccountType;
import com.vikash_api.repositories.AccountRepository;
import com.vikash_api.repositories.InstitutionRepository;
import com.vikash_api.entities.FinancialInstitutionEntity;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import com.vikash_api.entities.RefreshTokenEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.repositories.RefreshTokenRepository;
import com.vikash_api.repositories.UserRepository;
import com.vikash_api.services.JwtService;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private InstitutionRepository institutionRepository;

    @Autowired
    private JwtService jwtService;

    private RestClient restClient;

    @Test
    void logoutRevokesAccessAndRefreshTokensFromTheSession() {
        AuthResponse auth = restClient.post().uri("/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new RegisterRequest("Logout", "logout@example.com", "Password123!"))
                .retrieve().body(AuthResponse.class);

        assertThat(meStatus(auth.getAccessToken())).isEqualTo(200);
        var logout = restClient.post().uri("/logout")
                .header("Authorization", "Bearer " + auth.getAccessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(new RefreshTokenRequest(auth.getRefreshToken()))
                .retrieve().toBodilessEntity();

        assertThat(logout.getStatusCode().value()).isEqualTo(204);
        assertThat(meStatus(auth.getAccessToken())).isEqualTo(401);
        assertThat(refreshStatus(auth.getRefreshToken())).isIn(401, 403);
    }

    private int meStatus(String accessToken) {
        return restClient.get().uri("/me").header("Authorization", "Bearer " + accessToken)
                .exchange((request, response) -> response.getStatusCode().value());
    }

    private int refreshStatus(String refreshToken) {
        return restClient.post().uri("/refresh").contentType(MediaType.APPLICATION_JSON)
                .body(new RefreshTokenRequest(refreshToken))
                .exchange((request, response) -> response.getStatusCode().value());
    }

    @Test
    void logoutWithoutBodyRevokesRotatedTokensButKeepsOtherLogins() {
        AuthResponse original = register("rotation@example.com");
        AuthResponse otherLogin = restClient.post().uri("/login").contentType(MediaType.APPLICATION_JSON)
                .body(new LoginRequest("rotation@example.com", "Password123!"))
                .retrieve().body(AuthResponse.class);
        AuthResponse rotated = refresh(original.getRefreshToken());

        assertThat(meStatus(original.getAccessToken())).isEqualTo(200);
        assertThat(meStatus(rotated.getAccessToken())).isEqualTo(200);
        restClient.post().uri("/logout").header("Authorization", "Bearer " + original.getAccessToken())
                .retrieve().toBodilessEntity();

        assertThat(meStatus(original.getAccessToken())).isEqualTo(401);
        assertThat(meStatus(rotated.getAccessToken())).isEqualTo(401);
        assertThat(refreshStatus(rotated.getRefreshToken())).isIn(401, 403);
        assertThat(refreshStatus(original.getRefreshToken())).isIn(401, 403);
        assertThat(meStatus(otherLogin.getAccessToken())).isEqualTo(200);
        assertThat(refreshStatus(otherLogin.getRefreshToken())).isEqualTo(200);
    }

    @Test
    void logoutCannotRevokeAnotherUsersSessionThroughTheBody() {
        AuthResponse first = register("first@example.com");
        AuthResponse second = register("second@example.com");
        restClient.post().uri("/logout").header("Authorization", "Bearer " + first.getAccessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(new RefreshTokenRequest(second.getRefreshToken()))
                .retrieve().toBodilessEntity();

        assertThat(meStatus(first.getAccessToken())).isEqualTo(401);
        assertThat(refreshStatus(first.getRefreshToken())).isIn(401, 403);
        assertThat(meStatus(second.getAccessToken())).isEqualTo(200);
        assertThat(refreshStatus(second.getRefreshToken())).isEqualTo(200);
    }

    @Test
    void reusingRotatedRefreshTokenPermanentlyRevokesTheSession() {
        AuthResponse original = register("reuse@example.com");
        AuthResponse rotated = refresh(original.getRefreshToken());
        assertThat(refreshStatus(original.getRefreshToken())).isEqualTo(403);
        assertThat(meStatus(original.getAccessToken())).isEqualTo(401);
        assertThat(meStatus(rotated.getAccessToken())).isEqualTo(401);
        assertThat(refreshStatus(rotated.getRefreshToken())).isIn(401, 403);
    }

    @Test
    void rejectsAccessTokensWithoutAnActiveSessionOwnedByTheUser() {
        AuthResponse first = register("claims-first@example.com");
        AuthResponse second = register("claims-second@example.com");
        UserEntity firstUser = userRepository.findByEmail("claims-first@example.com").orElseThrow();
        String secondFamily = jwtService.extractAccessTokenClaims(second.getAccessToken())
                .get("familyId", String.class);

        assertThat(meStatus(jwtService.generateAccessToken(firstUser, null))).isEqualTo(401);
        assertThat(meStatus(jwtService.generateAccessToken(firstUser, UUID.randomUUID().toString())))
                .isEqualTo(401);
        assertThat(meStatus(jwtService.generateAccessToken(firstUser, secondFamily))).isEqualTo(401);
        assertThat(meStatus(first.getRefreshToken())).isEqualTo(401);
        assertThat(meStatus(first.getAccessToken() + "tampered")).isEqualTo(401);

        RefreshTokenEntity stored = refreshTokenRepository.findByTokenHash(
                jwtService.hashToken(first.getRefreshToken())).orElseThrow();
        stored.setExpiresAt(Instant.now().minusSeconds(60));
        refreshTokenRepository.save(stored);
        assertThat(meStatus(first.getAccessToken())).isEqualTo(401);
        assertThat(meStatus(second.getAccessToken())).isEqualTo(200);
    }

    @Test
    void concurrentRefreshCannotReopenALoggedOutSession() throws Exception {
        for (int attempt = 0; attempt < 5; attempt++) {
            AuthResponse auth = register("concurrent-" + attempt + "@example.com");
            CountDownLatch ready = new CountDownLatch(2);
            CountDownLatch start = new CountDownLatch(1);
            try (var executor = Executors.newFixedThreadPool(2)) {
                var refreshResult = executor.submit(() -> {
                    ready.countDown();
                    assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();
                    try {
                        return refresh(auth.getRefreshToken());
                    } catch (HttpClientErrorException e) {
                        assertThat(e.getStatusCode().value()).isIn(401, 403);
                        return null;
                    }
                });
                var logoutResult = executor.submit(() -> {
                    ready.countDown();
                    assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();
                    return restClient.post().uri("/logout")
                            .header("Authorization", "Bearer " + auth.getAccessToken())
                            .retrieve().toBodilessEntity();
                });
                try {
                    assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
                } finally {
                    start.countDown();
                }
                assertThat(logoutResult.get(10, TimeUnit.SECONDS).getStatusCode().value()).isEqualTo(204);
                AuthResponse rotated = refreshResult.get(10, TimeUnit.SECONDS);
                assertThat(meStatus(auth.getAccessToken())).isEqualTo(401);
                if (rotated != null) {
                    assertThat(meStatus(rotated.getAccessToken())).isEqualTo(401);
                    assertThat(refreshStatus(rotated.getRefreshToken())).isIn(401, 403);
                }
                assertThat(refreshStatus(auth.getRefreshToken())).isIn(401, 403);
            }
        }
    }

    private AuthResponse register(String email) {
        return restClient.post().uri("/register").contentType(MediaType.APPLICATION_JSON)
                .body(new RegisterRequest("Sessão de teste", email, "Password123!"))
                .retrieve().body(AuthResponse.class);
    }

    private AuthResponse refresh(String refreshToken) {
        return restClient.post().uri("/refresh").contentType(MediaType.APPLICATION_JSON)
                .body(new RefreshTokenRequest(refreshToken)).retrieve().body(AuthResponse.class);
    }

    @Test
    void allowsTransactionPreflightWithAccessTokenHeaderWithoutAuthentication() {
        var response = RestClient.create()
                .method(org.springframework.http.HttpMethod.OPTIONS)
                .uri("http://localhost:" + port + "/api/transaction/create")
                .header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "access_token,authorization,content-type")
                .retrieve()
                .toBodilessEntity();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isEqualTo("http://localhost:5173");
        assertThat(response.getHeaders().getAccessControlAllowHeaders())
                .contains("access_token", "authorization", "content-type");
    }

    @BeforeEach
    void setUp() {
        restClient = RestClient.builder()
                .baseUrl("http://localhost:" + port + "/api/auth")
                .build();
        accountRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void registrationTokenCreatesPersistedWalletAccount() {
        AuthResponse auth = restClient.post().uri("/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new RegisterRequest("Novo usuário", "account-flow@example.com", "Password123!"))
                .retrieve().body(AuthResponse.class);
        RestClient accountClient = RestClient.builder()
                .baseUrl("http://localhost:" + port + "/api/account")
                .defaultHeader("Authorization", "Bearer " + auth.getAccessToken()).build();

        var result = accountClient.post().uri("/create").contentType(MediaType.APPLICATION_JSON)
                .body(new AccountRequest(AccountType.CARTEIRA, null, "Dinheiro de bolso", new BigDecimal("35.50")))
                .retrieve().toEntity(AccountResponse.class);

        assertThat(result.getStatusCode().value()).isEqualTo(201);
        AccountResponse account = result.getBody();
        assertThat(account.uuid()).isNotNull();
        assertThat(account.description()).isEqualTo("Dinheiro de bolso");
        assertThat(account.type()).isEqualTo(AccountType.CARTEIRA);
        assertThat(account.balance()).isEqualByComparingTo("35.50");
        assertThat(account.financialInstitution()).isNull();
        var stored = accountRepository.findAll().stream()
                .filter(entity -> account.uuid().equals(entity.getUuid())).findFirst().orElseThrow();
        assertThat(stored.getUuid()).isEqualTo(account.uuid());
        assertThat(stored.getUser().getId()).isEqualTo(userRepository.findByEmail("account-flow@example.com").orElseThrow().getId());

        FinancialInstitutionEntity institution = new FinancialInstitutionEntity();
        ReflectionTestUtils.setField(institution, "name", "Banco de teste");
        ReflectionTestUtils.setField(institution, "logoUrl", "/images/test.webp");
        institution = institutionRepository.save(institution);
        AccountResponse bankAccount = accountClient.post().uri("/create").contentType(MediaType.APPLICATION_JSON)
                .body(new AccountRequest(AccountType.CONTA_CORRENTE, institution.getId(), "Conta principal", new BigDecimal("1200.25")))
                .retrieve().body(AccountResponse.class);
        assertThat(bankAccount.financialInstitution().id()).isEqualTo(institution.getId());
        assertThat(bankAccount.financialInstitution().name()).isEqualTo("Banco de teste");
        assertThat(bankAccount.financialInstitution().logoUrl()).isEqualTo("/images/test.webp");
        assertThat(bankAccount.uuid()).isNotNull();
        assertThat(accountRepository.findAll()).anyMatch(entity -> bankAccount.uuid().equals(entity.getUuid()));

        assertThatThrownBy(() -> accountClient.post().uri("/create").contentType(MediaType.APPLICATION_JSON)
                .body(new AccountRequest(AccountType.CARTEIRA, 1L, "Carteira", BigDecimal.ZERO))
                .retrieve().toBodilessEntity()).isInstanceOf(HttpClientErrorException.BadRequest.class);
        assertThatThrownBy(() -> accountClient.post().uri("/create").contentType(MediaType.APPLICATION_JSON)
                .body(new AccountRequest(AccountType.POUPANCA, Long.MAX_VALUE, "Reserva", BigDecimal.ZERO))
                .retrieve().toBodilessEntity()).isInstanceOf(HttpClientErrorException.NotFound.class);
        assertThat(accountRepository.count()).isEqualTo(2);
    }

    @Test
    @DisplayName("Complete Flow: Register -> Database Verification -> Login -> Refresh -> Me -> Logout")
    void shouldExecuteCompleteAuthLifecycle() {
        // 1. REGISTER
        RegisterRequest registerReq = RegisterRequest.builder()
                .name("Vikash Real")
                .email("vikash.real@example.com")
                .password("Password123!")
                .build();

        AuthResponse registeredAuth = restClient.post()
                .uri("/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body(registerReq)
                .retrieve()
                .body(AuthResponse.class);

        assertThat(registeredAuth).isNotNull();
        assertThat(registeredAuth.getAccessToken()).isNotBlank();
        assertThat(registeredAuth.getRefreshToken()).isNotBlank();
        assertThat(registeredAuth.getUser().getUuid()).isNotNull();
        assertThat(registeredAuth.getUser().getEmail()).isEqualTo("vikash.real@example.com");

        // 2. VERIFY IN DATABASE (Security checks)
        Optional<UserEntity> userInDb = userRepository.findByEmail("vikash.real@example.com");
        assertThat(userInDb).isPresent();
        // Password must be hashed with BCrypt, never plaintext!
        assertThat(userInDb.get().getPassword()).startsWith("$2a$");
        assertThat(passwordEncoder.matches("Password123!", userInDb.get().getPassword())).isTrue();
        // Internal id is a Long number
        assertThat(userInDb.get().getId()).isNotNull();
        assertThat(userInDb.get().getUuid()).isEqualTo(registeredAuth.getUser().getUuid());

        // Refresh token must be in DB hashed with SHA-256 (64 hex characters)
        assertThat(refreshTokenRepository.findAll()).hasSize(1);
        RefreshTokenEntity storedToken = refreshTokenRepository.findAll().get(0);
        assertThat(storedToken.getTokenHash()).hasSize(64);
        assertThat(storedToken.getUser().getId()).isEqualTo(userInDb.get().getId());

        // 3. ATTEMPT DUPLICATE REGISTER (Must throw 409 Conflict)
        assertThatThrownBy(() -> restClient.post()
                .uri("/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body(registerReq)
                .retrieve()
                .toBodilessEntity())
                .isInstanceOf(HttpClientErrorException.Conflict.class);

        // 4. LOGIN
        LoginRequest loginReq = LoginRequest.builder()
                .email("vikash.real@example.com")
                .password("Password123!")
                .build();

        AuthResponse loginAuth = restClient.post()
                .uri("/login")
                .contentType(MediaType.APPLICATION_JSON)
                .body(loginReq)
                .retrieve()
                .body(AuthResponse.class);

        assertThat(loginAuth).isNotNull();
        assertThat(loginAuth.getAccessToken()).isNotBlank();

        // 5. ACCESS PROTECTED /me ENDPOINT WITH ACCESS TOKEN
        String meResponseBody = restClient.get()
                .uri("/me")
                .header("Authorization", "Bearer " + loginAuth.getAccessToken())
                .retrieve()
                .body(String.class);

        assertThat(meResponseBody).contains("vikash.real@example.com");
        assertThat(meResponseBody).contains(userInDb.get().getUuid().toString());

        // 6. ROTATE TOKEN WITH /refresh
        RefreshTokenRequest refreshReq = new RefreshTokenRequest(loginAuth.getRefreshToken());
        AuthResponse newAuth = restClient.post()
                .uri("/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .body(refreshReq)
                .retrieve()
                .body(AuthResponse.class);

        assertThat(newAuth).isNotNull();
        assertThat(newAuth.getAccessToken()).isNotEqualTo(loginAuth.getAccessToken());
        assertThat(newAuth.getRefreshToken()).isNotEqualTo(loginAuth.getRefreshToken());

        // 7. SECURITY: REUSING OLD ROTATED REFRESH TOKEN MUST BE FORBIDDEN (403)
        assertThatThrownBy(() -> restClient.post()
                .uri("/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .body(refreshReq)
                .retrieve()
                .toBodilessEntity())
                .isInstanceOf(HttpClientErrorException.Forbidden.class);
    }
}
