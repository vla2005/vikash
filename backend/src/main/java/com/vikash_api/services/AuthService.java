package com.vikash_api.services;

import com.vikash_api.dtos.requests.LoginRequest;
import com.vikash_api.dtos.requests.RefreshTokenRequest;
import com.vikash_api.dtos.requests.RegisterRequest;
import com.vikash_api.dtos.requests.ForgotPasswordRequest;
import com.vikash_api.dtos.requests.ResetPasswordRequest;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.dtos.responses.UserResponse;
import com.vikash_api.entities.RefreshTokenEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.entities.PasswordResetTokenEntity;
import com.vikash_api.enums.Role;
import com.vikash_api.exceptions.EmailAlreadyExistsException;
import com.vikash_api.exceptions.InvalidTokenException;
import com.vikash_api.exceptions.TokenCompromisedException;
import com.vikash_api.exceptions.PasswordResetException;
import com.vikash_api.exceptions.EmailDeliveryException;
import com.vikash_api.repositories.RefreshTokenRepository;
import com.vikash_api.repositories.UserRepository;
import com.vikash_api.repositories.PasswordResetTokenRepository;
import io.jsonwebtoken.Claims;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.UUID;
import java.util.Locale;
import java.util.Base64;
import java.security.SecureRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final LoginAttemptService loginAttemptService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final JavaMailSender mailSender;

    @Value("${security.password-reset.url}")
    private String passwordResetUrl;

    @Value("${spring.mail.from}")
    private String mailFrom;

    // O envio ocorre fora da resposta HTTP para não revelar se o e-mail está cadastrado.
    @Async
    @Transactional
    public void requestPasswordReset(ForgotPasswordRequest request) {
        UserEntity user = userRepository.findByEmailForUpdate(request.email()).orElse(null);
        if (user == null || !user.isActive()) { return; }

        Instant now = Instant.now();
        // Evita enviar vários links para o mesmo usuário em menos de um minuto.
        if (passwordResetTokenRepository.existsByUserAndCreatedAtAfter(user, now.minusSeconds(60))) { return; }

        byte[] randomBytes = new byte[32];
        new SecureRandom().nextBytes(randomBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        passwordResetTokenRepository.markAllUsedByUser(user, now);
        passwordResetTokenRepository.save(PasswordResetTokenEntity.builder()
                .user(user)
                .email(user.getEmail())
                .tokenHash(jwtService.hashToken(token))
                .expiresAt(now.plusSeconds(15 * 60))
                .build());

        sendPasswordResetEmail(user, token);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String tokenHash = jwtService.hashToken(request.token());
        UUID userUuid = passwordResetTokenRepository.findUserUuidByTokenHash(tokenHash)
                .orElseThrow(() -> new PasswordResetException("Link de recuperação inválido ou expirado. Solicite um novo link."));

        // Mesmo bloqueio de refresh e logout: o token só pode ser usado uma vez.
        UserEntity user = userRepository.findByUuidForUpdate(userUuid)
                .orElseThrow(() -> new PasswordResetException("Link de recuperação inválido ou expirado. Solicite um novo link."));
        PasswordResetTokenEntity resetToken = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new PasswordResetException("Link de recuperação inválido ou expirado. Solicite um novo link."));

        Instant now = Instant.now();
        if (resetToken.getUsedAt() != null || !resetToken.getExpiresAt().isAfter(now)
                || !user.isActive() || !resetToken.getEmail().equals(user.getEmail())) {
            throw new PasswordResetException("Link de recuperação inválido ou expirado. Solicite um novo link.");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        resetToken.setUsedAt(now);
        passwordResetTokenRepository.save(resetToken);
        passwordResetTokenRepository.markAllUsedByUser(user, now);
        refreshTokenRepository.revokeAllByUser(user);
    }

    private void sendPasswordResetEmail(UserEntity user, String token) {
        String link = UriComponentsBuilder.fromUriString(passwordResetUrl)
                .queryParam("token", token).build().toUriString();
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(user.getEmail());
        message.setSubject("Redefina sua senha no Vikash");
        message.setText("Para redefinir sua senha, acesse o link abaixo:\n\n" + link
                + "\n\nEste link é válido por 15 minutos e só pode ser utilizado uma vez."
                + "\nSe você não solicitou a recuperação, ignore este e-mail.");
        try {
            mailSender.send(message);
        } catch (MailException ex) {
            throw new EmailDeliveryException("Não foi possível enviar o e-mail de recuperação.", ex);
        }
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyExistsException("Email '" + request.getEmail() + "' is already in use");
        }

        UserEntity user = UserEntity.builder()
                .name(request.getName().trim())
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.ROLE_USER)
                .active(true)
                .build();

        UserEntity savedUser = userRepository.save(user);
        log.info("User registered successfully: uuid={}, email={}", savedUser.getUuid(), savedUser.getEmail());

        String familyId = UUID.randomUUID().toString();

        return createAuthResponse(savedUser, familyId);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        return login(request, "internal");
    }

    @Transactional
    public AuthResponse login(LoginRequest request, String origin) {
        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        loginAttemptService.check(normalizedEmail, origin);

        try {
            // Impede um login com a senha antiga de criar uma sessão durante o reset.
            userRepository.findByEmailForUpdate(normalizedEmail)
                    .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalizedEmail, request.getPassword()));

            UserEntity user = (UserEntity) authentication.getPrincipal();
            log.info("User logged in successfully: uuid={}, email={}", user.getUuid(), user.getEmail());

            String familyId = UUID.randomUUID().toString();
            return createAuthResponse(user, familyId);
        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Invalid email or password");
        }
    }

    @Transactional(noRollbackFor = {TokenCompromisedException.class, InvalidTokenException.class})
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String rawToken = request.getRefreshToken();

        if (!jwtService.isRefreshTokenValid(rawToken)) {
            throw new InvalidTokenException("Invalid or expired refresh token");
        }

        Claims claims = jwtService.extractRefreshTokenClaims(rawToken);
        // Refresh e logout usam o mesmo bloqueio para não reabrir uma sessão encerrada.
        UserEntity user = lockTokenUser(claims);
        String familyId = getFamilyId(claims);
        String tokenHash = jwtService.hashToken(rawToken);
        RefreshTokenEntity storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new InvalidTokenException("Refresh token was not recognized"));

        if (!storedToken.getUser().getUuid().equals(user.getUuid())
                || !storedToken.getFamilyId().equals(familyId)) {
            throw new InvalidTokenException("Refresh token does not belong to this session");
        }

        // 🚨 REUSE DETECTION: If this token is already revoked, potential token theft
        // occurred!
        if (storedToken.isRevoked()) {
            log.warn("SECURITY ALERT: Attempt to reuse revoked refresh token. Invalidating token family {}",
                    storedToken.getFamilyId());
            refreshTokenRepository.revokeAllByFamilyId(storedToken.getFamilyId());
            throw new TokenCompromisedException(
                    "Security Alert: Token reuse detected. This session has been invalidated.");
        }

        if (storedToken.isExpired()) {
            storedToken.setRevoked(true);
            refreshTokenRepository.save(storedToken);
            throw new InvalidTokenException("Refresh token has expired");
        }

        // Token rotation: Revoke current token
        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        // Continue the same family session
        return createAuthResponse(user, storedToken.getFamilyId());
    }

    @Transactional
    public void logout(String accessToken) {
        if (!jwtService.isAccessTokenValid(accessToken)) {
            throw new InvalidTokenException("Invalid or expired access token");
        }

        Claims claims = jwtService.extractAccessTokenClaims(accessToken);
        UserEntity user = lockTokenUser(claims);
        String familyId = getFamilyId(claims);
        if (!refreshTokenRepository.existsByFamilyIdAndUser_UuidAndRevokedFalseAndExpiresAtAfter(
                familyId, user.getUuid(), Instant.now())) {
            throw new InvalidTokenException("Session has expired or been revoked");
        }

        refreshTokenRepository.revokeAllByFamilyId(familyId);
        log.info("Session revoked for user {}", user.getEmail());
    }

    private UserEntity lockTokenUser(Claims claims) {
        UUID userUuid;
        try {
            userUuid = UUID.fromString(claims.get("userId", String.class));
        } catch (IllegalArgumentException e) {
            throw new InvalidTokenException("Invalid token user");
        }
        return userRepository.findByUuidForUpdate(userUuid)
                .orElseThrow(() -> new InvalidTokenException("Token user was not found"));
    }

    private String getFamilyId(Claims claims) {
        String familyId = claims.get("familyId", String.class);
        if (familyId == null || familyId.isBlank()) {
            throw new InvalidTokenException("Token session was not found");
        }
        return familyId;
    }

    public UserResponse getProfile(UserEntity user) {
        return UserResponse.fromEntity(user);
    }

    private AuthResponse createAuthResponse(UserEntity user, String familyId) {
        String accessToken = jwtService.generateAccessToken(user, familyId);
        String refreshToken = jwtService.generateRefreshToken(user, familyId);

        String tokenHash = jwtService.hashToken(refreshToken);
        Instant expiresAt = Instant.now().plusMillis(jwtService.getRefreshTokenExpirationMs());

        RefreshTokenEntity refreshTokenEntity = RefreshTokenEntity.builder()
                .user(user)
                .tokenHash(tokenHash)
                .familyId(familyId)
                .revoked(false)
                .expiresAt(expiresAt)
                .build();

        refreshTokenRepository.save(refreshTokenEntity);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtService.getAccessTokenExpirationMs() / 1000)
                .user(UserResponse.fromEntity(user))
                .build();
    }
}
