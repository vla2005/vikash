package com.vikash_api.services;

import com.vikash_api.dtos.requests.RegisterRequest;
import com.vikash_api.dtos.requests.ConfirmRegistrationRequest;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.entities.RegistrationChallengeEntity;
import com.vikash_api.exceptions.RegistrationVerificationException;
import com.vikash_api.repositories.RegistrationChallengeRepository;
import com.vikash_api.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.MailSendException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.util.HtmlUtils;
import java.io.IOException;
import jakarta.mail.MessagingException;
import java.util.Base64;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RegistrationService {
    private final RegistrationChallengeRepository challenges;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JavaMailSender mailSender;
    private final AuthService auth;
    private final RegistrationAttemptService limits;
    private static final SecureRandom RANDOM = new SecureRandom();
    @Value("${spring.mail.from}") private String mailFrom;
    @Value("${security.jwt.access-token-secret}") private String codeSecret;
    @Value("${security.registration.verify-url}") private String verificationUrl;

    @jakarta.annotation.PostConstruct
    void validateVerificationUrl() {
        if (!java.util.Set.of("https://api-vikash.viktorware.com/verify-email", "vikash://verify-email").contains(verificationUrl)) {
            throw new IllegalStateException("REGISTRATION_VERIFY_URL deve apontar para a rota de verificação do ViKash.");
        }
    }

    // Invoked through the Spring proxy: database/BCrypt/SMTP never affect public response timing.
    @Async
    @Transactional
    public void prepare(UUID id, RegisterRequest request) {
        Instant now = Instant.now();
        challenges.deleteExpired(now);
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) { return; }
        String code = String.format(Locale.ROOT, "%08d", RANDOM.nextInt(100_000_000));
        byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes);
        String linkToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        challenges.saveAndFlush(RegistrationChallengeEntity.builder().id(id).email(email)
                .name(request.getName().trim()).passwordHash(encoder.encode(request.getPassword()))
                .codeHash(hashCode(id, code)).linkTokenHash(hashCode(id, linkToken)).expiresAt(now.plusSeconds(900)).build());
        String link = verificationUrl + "?token=" + id + "." + linkToken;
        String text = "Seu código de confirmação é: " + code
                + "\n\nAbra o ViKash e confirme seu e-mail pelo link: " + link
                + "\nOu digite os 8 números no app onde iniciou o cadastro."
                + "\nVálido por 15 minutos, com no máximo 5 tentativas."
                + "\nNão compartilhe este e-mail. Se não pediu o cadastro, ignore esta mensagem.";
        try {
            String html = new ClassPathResource("email/registration-verification.html")
                    .getContentAsString(StandardCharsets.UTF_8)
                    .replace("{{verificationLink}}", HtmlUtils.htmlEscape(link, "UTF-8"))
                    .replace("{{code}}", code);
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFrom); helper.setTo(email);
            helper.setSubject("Confirme seu cadastro no ViKash");
            helper.setText(text, html);
            mailSender.send(message);
        } catch (MessagingException | IOException ex) {
            throw new MailSendException("Não foi possível preparar o e-mail de confirmação.", ex);
        }
    }

    // Persist failed guesses too. The row lock makes consumption/replay atomic across replicas.
    @Transactional(noRollbackFor = RegistrationVerificationException.class)
    public AuthResponse confirm(ConfirmRegistrationRequest request, String origin) {
        limits.confirm(request.challengeId().toString(), origin);
        var challenge = challenges.findForUpdate(request.challengeId()).orElseThrow(RegistrationVerificationException::new);
        Instant now = Instant.now();
        if (challenge.getUsedAt() != null || !challenge.getExpiresAt().isAfter(now) || challenge.getAttempts() >= 5) {
            throw new RegistrationVerificationException();
        }
        challenge.setAttempts(challenge.getAttempts() + 1);
        if (!MessageDigest.isEqual(challenge.getCodeHash().getBytes(StandardCharsets.US_ASCII),
                hashCode(challenge.getId(), request.code()).getBytes(StandardCharsets.US_ASCII))
                || users.existsByEmail(challenge.getEmail())) {
            throw new RegistrationVerificationException();
        }
        AuthResponse response = auth.createVerifiedAccount(challenge.getName(), challenge.getEmail(), challenge.getPasswordHash());
        challenge.setUsedAt(now);
        challenge.setPasswordHash("");
        challenge.setCodeHash("");
        challenge.setLinkTokenHash(null);
        return response;
    }

    @Transactional(noRollbackFor = RegistrationVerificationException.class)
    public void verifyLink(String token, String origin) {
        if (token == null || !token.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.[A-Za-z0-9_-]{43}")) {
            throw new RegistrationVerificationException();
        }
        UUID id = UUID.fromString(token.substring(0, 36));
        limits.confirm(id.toString(), origin);
        var challenge = challenges.findForUpdate(id).orElseThrow(RegistrationVerificationException::new);
        Instant now = Instant.now();
        if (challenge.getUsedAt() != null || !challenge.getExpiresAt().isAfter(now) || challenge.getAttempts() >= 5) {
            throw new RegistrationVerificationException();
        }
        challenge.setAttempts(challenge.getAttempts() + 1);
        if (challenge.getLinkTokenHash() == null || !MessageDigest.isEqual(
                challenge.getLinkTokenHash().getBytes(StandardCharsets.US_ASCII),
                hashCode(id, token.substring(37)).getBytes(StandardCharsets.US_ASCII))
                || users.existsByEmail(challenge.getEmail())) {
            throw new RegistrationVerificationException();
        }
        // Confirmar um e-mail não cria uma sessão nem troca a conta aberta no aplicativo.
        auth.createVerifiedUser(challenge.getName(), challenge.getEmail(), challenge.getPasswordHash());
        challenge.setUsedAt(now); challenge.setPasswordHash(""); challenge.setCodeHash(""); challenge.setLinkTokenHash(null);
    }

    private String hashCode(UUID id, String code) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(codeSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(("registration:" + id + ":" + code).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException ex) { throw new IllegalStateException("Não foi possível validar o cadastro.", ex); }
    }
}
