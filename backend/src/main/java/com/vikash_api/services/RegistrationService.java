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
import org.springframework.mail.SimpleMailMessage;
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

    // Invoked through the Spring proxy: database/BCrypt/SMTP never affect public response timing.
    @Async
    @Transactional
    public void prepare(UUID id, RegisterRequest request) {
        Instant now = Instant.now();
        challenges.deleteExpired(now);
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) { return; }
        String code = String.format(Locale.ROOT, "%08d", RANDOM.nextInt(100_000_000));
        challenges.saveAndFlush(RegistrationChallengeEntity.builder().id(id).email(email)
                .name(request.getName().trim()).passwordHash(encoder.encode(request.getPassword()))
                .codeHash(hashCode(id, code)).expiresAt(now.plusSeconds(900)).build());
        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setFrom(mailFrom);
        mail.setTo(email);
        mail.setSubject("Confirme seu cadastro no ViKash");
        mail.setText("Seu código de confirmação é: " + code
                + "\n\nDigite os 8 números no app onde você iniciou o cadastro."
                + "\nVálido por 15 minutos, com no máximo 5 tentativas."
                + "\nNão compartilhe este código. Se não pediu o cadastro, ignore este e-mail.");
        mailSender.send(mail);
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
        return response;
    }

    private String hashCode(UUID id, String code) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(codeSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(("registration:" + id + ":" + code).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException ex) { throw new IllegalStateException("Não foi possível validar o cadastro.", ex); }
    }
}
