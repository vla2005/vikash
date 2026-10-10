package com.vikash_api.service;

import com.vikash_api.dtos.requests.ForgotPasswordRequest;
import com.vikash_api.dtos.requests.ResetPasswordRequest;
import com.vikash_api.entities.PasswordResetTokenEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.exceptions.EmailDeliveryException;
import com.vikash_api.exceptions.PasswordResetException;
import com.vikash_api.repositories.PasswordResetTokenRepository;
import com.vikash_api.repositories.RefreshTokenRepository;
import com.vikash_api.repositories.UserRepository;
import com.vikash_api.services.AuthService;
import com.vikash_api.services.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import jakarta.mail.Multipart;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import com.vikash_api.support.EmailTestSupport;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {
    @Mock UserRepository users;
    @Mock RefreshTokenRepository refreshTokens;
    @Mock PasswordResetTokenRepository resetTokens;
    @Mock PasswordEncoder encoder;
    @Mock JwtService jwt;
    @Mock AuthenticationManager authenticationManager;
    @Mock JavaMailSender mailSender;
    @InjectMocks AuthService service;
    UserEntity user;

    @BeforeEach
    void setUp() {
        user = UserEntity.builder().uuid(UUID.randomUUID()).email("livia@example.com")
                .password("original-hash").active(true).build();
        ReflectionTestUtils.setField(service, "mailFrom", "no-reply@example.com");
        ReflectionTestUtils.setField(service, "passwordResetUrl", "https://vikash.example/reset-password");
    }

    @Test
    void sendsARandomTokenAndStoresOnlyItsHashWithFifteenMinutesOfValidity() throws Exception {
        when(mailSender.createMimeMessage()).thenAnswer(invocation -> EmailTestSupport.newMessage());
        when(users.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        when(jwt.hashToken(anyString())).thenReturn("stored-token-hash");
        Instant before = Instant.now();
        service.requestPasswordReset(new ForgotPasswordRequest(" LIVIA@example.com "));

        ArgumentCaptor<PasswordResetTokenEntity> saved = ArgumentCaptor.forClass(PasswordResetTokenEntity.class);
        verify(resetTokens).save(saved.capture());
        assertThat(saved.getValue().getTokenHash()).isEqualTo("stored-token-hash");
        assertThat(saved.getValue().getExpiresAt()).isBetween(before.plusSeconds(900), Instant.now().plusSeconds(900));
        assertThat(saved.getValue().getUsedAt()).isNull();
        assertThat(saved.getValue().getEmail()).isEqualTo(user.getEmail());

        ArgumentCaptor<MimeMessage> mail = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(mail.capture());
        assertThat(((InternetAddress) mail.getValue().getFrom()[0]).getAddress()).isEqualTo("no-reply@example.com");
        assertThat(((InternetAddress) mail.getValue().getFrom()[0]).getPersonal()).isEqualTo("Vikash");
        assertThat(((InternetAddress) mail.getValue().getAllRecipients()[0]).getAddress()).isEqualTo(user.getEmail());
        assertThat(EmailTestSupport.html(mail.getValue())).contains("Olá!");
        String token = EmailTestSupport.text(mail.getValue()).split("token=")[1].split("\\s")[0];
        assertThat(token).matches("[A-Za-z0-9_-]{43}");
        assertThat(Base64.getUrlDecoder().decode(token)).hasSize(32);
        verify(jwt).hashToken(token);
        verify(resetTokens).markAllUsedByUser(eq(user), any(Instant.class));
        verifyNoInteractions(encoder, refreshTokens);
    }

    @Test
    void unknownEmailDoesNotSendMailOrChangeAnything() {
        service.requestPasswordReset(new ForgotPasswordRequest("missing@example.com"));
        verifyNoInteractions(resetTokens, mailSender, encoder, refreshTokens);
    }

    @Test
    void disabledUserDoesNotReceiveARecoveryLink() {
        user.setActive(false);
        when(users.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        service.requestPasswordReset(new ForgotPasswordRequest(user.getEmail()));
        verifyNoInteractions(resetTokens, mailSender, encoder, refreshTokens);
    }

    @Test
    void repeatedRequestWithinAMinuteDoesNotSendAnotherEmail() {
        when(users.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        when(resetTokens.existsByUserAndCreatedAtAfter(eq(user), any())).thenReturn(true);
        service.requestPasswordReset(new ForgotPasswordRequest(user.getEmail()));
        verify(resetTokens, never()).save(any());
        verify(resetTokens, never()).markAllUsedByUser(any(), any());
        verifyNoInteractions(mailSender);
    }

    @Test
    void mailFailureIsWrappedInASpecificExceptionWithoutChangingThePassword() {
        when(mailSender.createMimeMessage()).thenAnswer(invocation -> EmailTestSupport.newMessage());
        when(users.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        when(jwt.hashToken(anyString())).thenReturn("hash");
        doThrow(new MailSendException("SMTP unavailable")).when(mailSender).send(any(MimeMessage.class));
        assertThatThrownBy(() -> service.requestPasswordReset(new ForgotPasswordRequest(user.getEmail())))
                .isInstanceOf(EmailDeliveryException.class);
        assertThat(user.getPassword()).isEqualTo("original-hash");
        verifyNoInteractions(encoder, refreshTokens);
    }

    @Test
    void sendsEscapedHtmlAndPlainTextWithAnEmbeddedLogo() throws Exception {
        user.setName("Lívia & <b>Teste</b>");
        ReflectionTestUtils.setField(service, "passwordResetUrl", "https://vikash.example/reset-password?source=app&lang=pt");
        when(users.findByEmailForUpdate(user.getEmail())).thenReturn(Optional.of(user));
        when(jwt.hashToken(anyString())).thenReturn("hash");
        when(mailSender.createMimeMessage()).thenAnswer(invocation -> EmailTestSupport.newMessage());
        service.requestPasswordReset(new ForgotPasswordRequest(user.getEmail()));

        var mail = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(mail.capture());
        String html = EmailTestSupport.html(mail.getValue());
        String text = EmailTestSupport.text(mail.getValue());
        String link = text.split("\n\n")[2];
        assertThat(html).contains("Olá, Lívia &amp; &lt;b&gt;Teste&lt;/b&gt;!", "Redefinir minha senha",
                "15 minutos", "cid:vikash-logo", "source=app&amp;lang=pt&amp;token=");
        assertThat(html).doesNotContain("<b>Teste</b>", "{{", "<script", "https://fonts.");
        assertThat(text).contains("Olá, Lívia & <b>Teste</b>!", "15 minutos", "todas as suas sessões serão encerradas");
        assertThat(html).contains(link.replace("&", "&amp;"));
        Multipart related = (Multipart) mail.getValue().getContent();
        assertThat(related.getCount()).isEqualTo(2);
        var logo = related.getBodyPart(1);
        assertThat(logo.getHeader("Content-ID")).containsExactly("<vikash-logo>");
        assertThat(logo.getDisposition()).isEqualTo("inline");
        assertThat(logo.getInputStream().readAllBytes()).isNotEmpty().hasSizeLessThan(30000);
    }

    @Test
    void successfulResetHashesThePasswordConsumesTokensAndRevokesEverySession() {
        PasswordResetTokenEntity token = stubToken();
        when(encoder.encode(" NewPassword123! ")).thenReturn("new-hash");
        service.resetPassword(new ResetPasswordRequest("raw-token", " NewPassword123! "));
        assertThat(user.getPassword()).isEqualTo("new-hash");
        assertThat(token.getUsedAt()).isNotNull();
        verify(users).save(user);
        verify(resetTokens).save(token);
        verify(resetTokens).markAllUsedByUser(eq(user), any());
        verify(refreshTokens).revokeAllByUser(user);
        verifyNoInteractions(mailSender);
    }

    @ParameterizedTest
    @ValueSource(strings = {"expired", "used", "disabled", "email-changed"})
    void invalidRecoveryLinksNeverChangeThePasswordOrRevokeSessions(String reason) {
        PasswordResetTokenEntity token = stubToken();
        switch (reason) {
            case "expired" -> token.setExpiresAt(Instant.now().minusSeconds(1));
            case "used" -> token.setUsedAt(Instant.now());
            case "disabled" -> user.setActive(false);
            case "email-changed" -> user.setEmail("changed@example.com");
        }
        assertThatThrownBy(() -> service.resetPassword(new ResetPasswordRequest("raw-token", "NewPassword123!")))
                .isInstanceOf(PasswordResetException.class);
        assertThat(user.getPassword()).isEqualTo("original-hash");
        verify(users, never()).save(any());
        verify(resetTokens, never()).save(any());
        verifyNoInteractions(encoder, refreshTokens);
    }

    @Test
    void unknownTokenIsRejectedBeforeAnyUserIsLockedOrChanged() {
        when(jwt.hashToken("unknown")).thenReturn("unknown-hash");
        assertThatThrownBy(() -> service.resetPassword(new ResetPasswordRequest("unknown", "NewPassword123!")))
                .isInstanceOf(PasswordResetException.class);
        verifyNoInteractions(users, encoder, refreshTokens);
    }

    private PasswordResetTokenEntity stubToken() {
        PasswordResetTokenEntity token = PasswordResetTokenEntity.builder().user(user).email(user.getEmail())
                .tokenHash("hash").expiresAt(Instant.now().plusSeconds(900)).build();
        when(jwt.hashToken("raw-token")).thenReturn("hash");
        when(resetTokens.findUserUuidByTokenHash("hash")).thenReturn(Optional.of(user.getUuid()));
        when(users.findByUuidForUpdate(user.getUuid())).thenReturn(Optional.of(user));
        when(resetTokens.findByTokenHash("hash")).thenReturn(Optional.of(token));
        return token;
    }
}
