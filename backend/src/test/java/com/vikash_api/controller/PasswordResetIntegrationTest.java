package com.vikash_api.controller;

import com.vikash_api.dtos.requests.*;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.entities.PasswordResetTokenEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.repositories.PasswordResetTokenRepository;
import com.vikash_api.repositories.RefreshTokenRepository;
import com.vikash_api.repositories.UserRepository;
import com.vikash_api.services.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import jakarta.mail.internet.MimeMessage;
import com.vikash_api.support.EmailTestSupport;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.RestClient;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:password-reset;DB_CLOSE_DELAY=-1")
class PasswordResetIntegrationTest {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired RefreshTokenRepository refreshTokens;
    @Autowired PasswordResetTokenRepository resetTokens;
    @Autowired PasswordEncoder encoder;
    @Autowired JwtService jwt;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean JavaMailSender mailSender;
    RestClient client;
    BlockingQueue<MimeMessage> sentMessages;

    @BeforeEach
    void setUp() {
        resetTokens.deleteAll();
        refreshTokens.deleteAll();
        users.deleteAll();
        reset(mailSender);
        sentMessages = new LinkedBlockingQueue<>();
        when(mailSender.createMimeMessage()).thenAnswer(invocation -> EmailTestSupport.newMessage());
        doAnswer(invocation -> {
            sentMessages.add(new MimeMessage(invocation.getArgument(0, MimeMessage.class)));
            return null;
        }).when(mailSender).send(any(MimeMessage.class));
        client = RestClient.create("http://localhost:" + port);
    }

    @Test
    void publicRequestSendsAnEmailWithOnlyARandomTokenAndReturnsNoBody() throws Exception {
        AuthResponse auth = register("livia@example.com");
        var response = client.post().uri("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .body(new ForgotPasswordRequest(" LIVIA@example.com ")).retrieve().toEntity(String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNullOrEmpty();
        String token = receivedToken();
        PasswordResetTokenEntity saved = resetTokens.findByTokenHash(jwt.hashToken(token)).orElseThrow();
        assertThat(saved.getTokenHash()).hasSize(64).isNotEqualTo(token);
        assertThat(saved.getExpiresAt()).isBetween(saved.getCreatedAt().plusSeconds(895), saved.getCreatedAt().plusSeconds(900));
        assertThat(saved.getUsedAt()).isNull();
        assertThat(meStatus(auth)).isEqualTo(200);
    }

    @Test
    void unknownEmailReceivesTheSameEmptyOkResponseWithoutSendingMail() {
        var response = client.post().uri("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .body(new ForgotPasswordRequest("missing@example.com")).retrieve().toEntity(String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNullOrEmpty();
        verify(mailSender, after(150).never()).send(any(MimeMessage.class));
        assertThat(resetTokens.count()).isZero();
    }

    @Test
    void passwordResetConsumesAllRecoveryLinksRevokesAllUserSessionsAndAllowsANewLogin() throws Exception {
        AuthResponse first = register("livia@example.com");
        AuthResponse second = login("livia@example.com", "Password123!");
        AuthResponse otherUser = register("other@example.com");
        requestLink(first.getUser().getEmail());
        String token = receivedToken();
        String anotherToken = seedToken(first, Instant.now().plusSeconds(900), null);
        String newPassword = " NewPassword123! ";

        var response = client.post().uri("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .body(new ResetPasswordRequest(token, newPassword)).retrieve().toEntity(String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNullOrEmpty();
        assertThat(resetTokens.findByTokenHash(jwt.hashToken(token)).orElseThrow().getUsedAt()).isNotNull();
        assertThat(resetTokens.findByTokenHash(jwt.hashToken(anotherToken)).orElseThrow().getUsedAt()).isNotNull();
        UserEntity updated = users.findByUuid(first.getUser().getUuid()).orElseThrow();
        assertThat(updated.getPassword()).isNotEqualTo(newPassword);
        assertThat(encoder.matches(newPassword, updated.getPassword())).isTrue();

        assertThat(meStatus(first)).isEqualTo(401);
        assertThat(meStatus(second)).isEqualTo(401);
        assertThat(refreshStatus(first)).isIn(401, 403);
        assertThat(refreshStatus(second)).isIn(401, 403);
        assertThat(meStatus(otherUser)).isEqualTo(200);
        assertThat(resetStatus(token, "AnotherPassword123!")).isEqualTo(400);
        assertThat(resetStatus(anotherToken, "AnotherPassword123!")).isEqualTo(400);
        assertThat(loginStatus("livia@example.com", "Password123!")).isEqualTo(401);
        assertThat(meStatus(login("livia@example.com", newPassword))).isEqualTo(200);
    }

    @Test
    void expiredUsedUnknownAndChangedEmailLinksCannotModifyTheUserOrItsSession() {
        AuthResponse auth = register("livia@example.com");
        String originalHash = users.findByUuid(auth.getUser().getUuid()).orElseThrow().getPassword();
        String expired = seedToken(auth, Instant.now().minusSeconds(1), null);
        String used = seedToken(auth, Instant.now().plusSeconds(900), Instant.now());
        assertThat(resetStatus(expired, "NewPassword123!")).isEqualTo(400);
        assertThat(resetStatus(used, "NewPassword123!")).isEqualTo(400);
        assertThat(resetStatus("A".repeat(43), "NewPassword123!")).isEqualTo(400);
        assertThat(meStatus(auth)).isEqualTo(200);

        String oldEmailToken = seedToken(auth, Instant.now().plusSeconds(900), null);
        UserEntity user = users.findByUuid(auth.getUser().getUuid()).orElseThrow();
        user.setEmail("updated@example.com");
        users.save(user);
        assertThat(resetStatus(oldEmailToken, "NewPassword123!")).isEqualTo(400);
        assertThat(users.findByUuid(auth.getUser().getUuid()).orElseThrow().getPassword()).isEqualTo(originalHash);
        assertThat(resetTokens.findByTokenHash(jwt.hashToken(oldEmailToken)).orElseThrow().getUsedAt()).isNull();
        // O refresh atualiza o e-mail do JWT sem encerrar a sessão existente.
        AuthResponse renewed = client.post().uri("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .body(new RefreshTokenRequest(auth.getRefreshToken())).retrieve().body(AuthResponse.class);
        assertThat(meStatus(renewed)).isEqualTo(200);
    }

    @Test
    void onlyOneOfTwoConcurrentResetsCanUseTheSameLink() throws Exception {
        AuthResponse auth = register("livia@example.com");
        String token = seedToken(auth, Instant.now().plusSeconds(900), null);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            Future<Integer> first = executor.submit(() -> { start.await(); return resetStatus(token, "FirstPassword123!"); });
            Future<Integer> second = executor.submit(() -> { start.await(); return resetStatus(token, "SecondPassword123!"); });
            start.countDown();
            int firstStatus = first.get(10, TimeUnit.SECONDS);
            int secondStatus = second.get(10, TimeUnit.SECONDS);
            assertThat(java.util.List.of(firstStatus, secondStatus)).containsExactlyInAnyOrder(200, 400);
            String winningPassword = firstStatus == 200 ? "FirstPassword123!" : "SecondPassword123!";
            assertThat(encoder.matches(winningPassword, users.findByUuid(auth.getUser().getUuid()).orElseThrow().getPassword())).isTrue();
        }
    }

    @Test
    void concurrentRefreshCannotLeaveAnActiveSessionAfterReset() throws Exception {
        AuthResponse auth = register("livia@example.com");
        String token = seedToken(auth, Instant.now().plusSeconds(900), null);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            Future<Integer> reset = executor.submit(() -> { start.await(); return resetStatus(token, "NewPassword123!"); });
            Future<AuthResponse> refresh = executor.submit(() -> {
                start.await();
                return client.post().uri("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .body(new RefreshTokenRequest(auth.getRefreshToken()))
                        .exchange((request, response) -> response.getStatusCode().value() == 200 ? response.bodyTo(AuthResponse.class) : null);
            });
            start.countDown();
            assertThat(reset.get(10, TimeUnit.SECONDS)).isEqualTo(200);
            AuthResponse rotated = refresh.get(10, TimeUnit.SECONDS);
            if (rotated != null) {
                assertThat(meStatus(rotated)).isEqualTo(401);
                assertThat(refreshStatus(rotated)).isIn(401, 403);
            }
            assertThat(meStatus(auth)).isEqualTo(401);
        }
    }

    @Test
    void issuingANewLinkInvalidatesPreviousLinksAndRepeatedRequestsAreThrottled() throws Exception {
        AuthResponse auth = register("livia@example.com");
        requestLink(auth.getUser().getEmail());
        String first = receivedToken();
        requestLink(auth.getUser().getEmail());
        verify(mailSender, after(150).times(1)).send(any(MimeMessage.class));
        assertThat(resetTokens.count()).isEqualTo(1);

        jdbc.update("UPDATE password_reset_tokens SET created_at = ?", java.sql.Timestamp.from(Instant.now().minusSeconds(65)));
        requestLink(auth.getUser().getEmail());
        String second = receivedToken();
        assertThat(second).isNotEqualTo(first);
        assertThat(resetStatus(first, "NewPassword123!")).isEqualTo(400);
        assertThat(resetStatus(second, "NewPassword123!")).isEqualTo(200);
    }

    @Test
    void smtpFailureRollsBackTheTokenAndPreservesThePasswordAndSession() {
        AuthResponse auth = register("livia@example.com");
        doThrow(new MailSendException("SMTP unavailable")).when(mailSender).send(any(MimeMessage.class));
        requestLink(auth.getUser().getEmail());
        verify(mailSender, timeout(3000)).send(any(MimeMessage.class));
        assertThat(resetTokens.count()).isZero();
        assertThat(meStatus(auth)).isEqualTo(200);
        assertThat(loginStatus("livia@example.com", "Password123!")).isEqualTo(200);
    }

    private String receivedToken() throws Exception {
        MimeMessage message = sentMessages.poll(5, TimeUnit.SECONDS);
        assertThat(message).isNotNull();
        String text = EmailTestSupport.text(message);
        assertThat(text).contains("https://vikash.example/reset-password?token=");
        assertThat(EmailTestSupport.html(message)).contains("Redefinir minha senha", "15 minutos", "cid:vikash-logo");
        String token = text.split("token=")[1].split("\\s")[0];
        for (int attempt = 0; attempt < 100; attempt++) {
            if (resetTokens.findByTokenHash(jwt.hashToken(token)).isPresent()) { return token; }
            Thread.sleep(20);
        }
        throw new AssertionError("O envio do e-mail não concluiu a gravação do token.");
    }

    private void requestLink(String email) {
        assertThat(client.post().uri("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .body(new ForgotPasswordRequest(email)).retrieve().toBodilessEntity().getStatusCode().value()).isEqualTo(200);
    }

    private String seedToken(AuthResponse auth, Instant expiresAt, Instant usedAt) {
        String token = UUID.randomUUID().toString().replace("-", "") + "A".repeat(11);
        UserEntity user = users.findByUuid(auth.getUser().getUuid()).orElseThrow();
        resetTokens.save(PasswordResetTokenEntity.builder().user(user).email(user.getEmail())
                .tokenHash(jwt.hashToken(token)).expiresAt(expiresAt).usedAt(usedAt).build());
        return token;
    }

    private int resetStatus(String token, String password) {
        return client.post().uri("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .body(new ResetPasswordRequest(token, password)).exchange((request, response) -> response.getStatusCode().value());
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

    private int loginStatus(String email, String password) {
        return client.post().uri("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .body(new LoginRequest(email, password)).exchange((request, response) -> response.getStatusCode().value());
    }

    private int meStatus(AuthResponse auth) {
        return client.get().uri("/api/auth/me").header("Authorization", "Bearer " + auth.getAccessToken())
                .exchange((request, response) -> response.getStatusCode().value());
    }

    private int refreshStatus(AuthResponse auth) {
        return client.post().uri("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .body(new RefreshTokenRequest(auth.getRefreshToken()))
                .exchange((request, response) -> response.getStatusCode().value());
    }
}
