package com.vikash_api.services;

import com.vikash_api.dtos.requests.LoginRequest;
import com.vikash_api.dtos.requests.RefreshTokenRequest;
import com.vikash_api.dtos.requests.RegisterRequest;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.dtos.responses.UserResponse;
import com.vikash_api.entities.RefreshTokenEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.enums.Role;
import com.vikash_api.exceptions.EmailAlreadyExistsException;
import com.vikash_api.exceptions.InvalidTokenException;
import com.vikash_api.exceptions.TokenCompromisedException;
import com.vikash_api.repositories.RefreshTokenRepository;
import com.vikash_api.repositories.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

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
        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);

        try {
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

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String rawToken = request.getRefreshToken();

        if (!jwtService.isRefreshTokenValid(rawToken)) {
            throw new InvalidTokenException("Invalid or expired refresh token");
        }

        String tokenHash = jwtService.hashToken(rawToken);
        RefreshTokenEntity storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new InvalidTokenException("Refresh token was not recognized"));

        // 🚨 REUSE DETECTION: If this token is already revoked, potential token theft
        // occurred!
        if (storedToken.isRevoked()) {
            log.warn("SECURITY ALERT: Attempt to reuse revoked refresh token. Invalidating token family {}",
                    storedToken.getFamilyId());
            refreshTokenRepository.revokeAllByFamilyId(storedToken.getFamilyId());
            throw new TokenCompromisedException(
                    "Security Alert: Token reuse detected. All active sessions have been invalidated.");
        }

        if (storedToken.isExpired()) {
            storedToken.setRevoked(true);
            refreshTokenRepository.save(storedToken);
            throw new InvalidTokenException("Refresh token has expired");
        }

        // Token rotation: Revoke current token
        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        UserEntity user = storedToken.getUser();
        // Continue the same family session
        return createAuthResponse(user, storedToken.getFamilyId());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String tokenHash = jwtService.hashToken(rawRefreshToken);
            refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
                token.setRevoked(true);
                refreshTokenRepository.save(token);
                log.info("Refresh token revoked for user {}", token.getUser().getEmail());
            });
        }
    }

    public UserResponse getProfile(UserEntity user) {
        return UserResponse.fromEntity(user);
    }

    private AuthResponse createAuthResponse(UserEntity user, String familyId) {
        String accessToken = jwtService.generateAccessToken(user);
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
