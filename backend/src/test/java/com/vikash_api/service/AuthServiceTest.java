package com.vikash_api.service;

import com.vikash_api.dtos.requests.LoginRequest;
import com.vikash_api.dtos.requests.RefreshTokenRequest;
import com.vikash_api.dtos.requests.RegisterRequest;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.entities.RefreshTokenEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.enums.Role;
import com.vikash_api.exceptions.EmailAlreadyExistsException;
import com.vikash_api.exceptions.InvalidTokenException;
import com.vikash_api.exceptions.TokenCompromisedException;
import com.vikash_api.repositories.RefreshTokenRepository;
import com.vikash_api.repositories.UserRepository;
import com.vikash_api.services.AuthService;
import com.vikash_api.services.JwtService;
import io.jsonwebtoken.Jwts;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private UserEntity testUser;

    @BeforeEach
    void setUp() {
        testUser = UserEntity.builder()
                .id(1L)
                .uuid(UUID.randomUUID())
                .name("Vikash")
                .email("vikash@example.com")
                .password("encoded_pass")
                .role(Role.ROLE_USER)
                .active(true)
                .build();
    }

    @Test
    @DisplayName("Should successfully register a new user and return tokens")
    void shouldRegisterUserSuccessfully() {
        RegisterRequest request = RegisterRequest.builder()
                .name("Vikash")
                .email("vikash@example.com")
                .password("secret123")
                .build();

        when(userRepository.existsByEmail("vikash@example.com")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("encoded_pass");
        when(userRepository.save(any(UserEntity.class))).thenReturn(testUser);
        when(jwtService.generateAccessToken(any(UserEntity.class), anyString())).thenReturn("access_token_123");
        when(jwtService.generateRefreshToken(any(UserEntity.class), anyString())).thenReturn("refresh_token_123");
        when(jwtService.hashToken("refresh_token_123")).thenReturn("hashed_token_123");
        when(jwtService.getAccessTokenExpirationMs()).thenReturn(900000L);
        when(jwtService.getRefreshTokenExpirationMs()).thenReturn(604800000L);

        AuthResponse response = authService.register(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("access_token_123");
        assertThat(response.getRefreshToken()).isEqualTo("refresh_token_123");
        assertThat(response.getUser().getEmail()).isEqualTo("vikash@example.com");

        verify(refreshTokenRepository).save(any(RefreshTokenEntity.class));
    }

    @Test
    @DisplayName("Should throw EmailAlreadyExistsException when registering existing email")
    void shouldThrowWhenEmailAlreadyExists() {
        RegisterRequest request = RegisterRequest.builder()
                .name("Vikash")
                .email("vikash@example.com")
                .password("secret123")
                .build();

        when(userRepository.existsByEmail("vikash@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(EmailAlreadyExistsException.class)
                .hasMessageContaining("already in use");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should login successfully with valid credentials")
    void shouldLoginSuccessfully() {
        LoginRequest request = LoginRequest.builder()
                .email("vikash@example.com")
                .password("secret123")
                .build();

        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(testUser);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(jwtService.generateAccessToken(eq(testUser), anyString())).thenReturn("access_token_123");
        when(jwtService.generateRefreshToken(eq(testUser), anyString())).thenReturn("refresh_token_123");
        when(jwtService.hashToken("refresh_token_123")).thenReturn("hashed_token_123");
        when(jwtService.getAccessTokenExpirationMs()).thenReturn(900000L);
        when(jwtService.getRefreshTokenExpirationMs()).thenReturn(604800000L);

        AuthResponse response = authService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("access_token_123");
        assertThat(response.getUser().getEmail()).isEqualTo("vikash@example.com");
    }

    @Test
    @DisplayName("Should throw BadCredentialsException on invalid login")
    void shouldThrowBadCredentialsOnFailedLogin() {
        LoginRequest request = LoginRequest.builder()
                .email("vikash@example.com")
                .password("wrong_password")
                .build();

        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Invalid email or password");
    }

    @Test
    @DisplayName("Should rotate refresh token when valid")
    void shouldRotateRefreshTokenSuccessfully() {
        String rawToken = "valid_refresh_token";
        String tokenHash = "hashed_refresh_token";
        String familyId = UUID.randomUUID().toString();

        RefreshTokenEntity storedToken = RefreshTokenEntity.builder()
                .id(100L)
                .user(testUser)
                .tokenHash(tokenHash)
                .familyId(familyId)
                .revoked(false)
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        when(jwtService.isRefreshTokenValid(rawToken)).thenReturn(true);
        mockRefreshClaims(rawToken, familyId);
        when(jwtService.hashToken(rawToken)).thenReturn(tokenHash);
        when(refreshTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(storedToken));
        when(jwtService.generateAccessToken(testUser, familyId)).thenReturn("new_access_token");
        when(jwtService.generateRefreshToken(testUser, familyId)).thenReturn("new_refresh_token");
        when(jwtService.hashToken("new_refresh_token")).thenReturn("new_hashed_token");
        when(jwtService.getAccessTokenExpirationMs()).thenReturn(900000L);
        when(jwtService.getRefreshTokenExpirationMs()).thenReturn(604800000L);

        RefreshTokenRequest request = new RefreshTokenRequest(rawToken);
        AuthResponse response = authService.refreshToken(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("new_access_token");
        assertThat(response.getRefreshToken()).isEqualTo("new_refresh_token");
        assertThat(storedToken.isRevoked()).isTrue(); // token was rotated/revoked
    }

    @Test
    @DisplayName("CRITICAL SECURITY: Should detect reuse of revoked refresh token and revoke entire family")
    void shouldDetectTokenReuseAndRevokeFamily() {
        String rawToken = "already_revoked_token";
        String tokenHash = "hashed_revoked_token";
        String familyId = "compromised-family-123";

        RefreshTokenEntity compromisedToken = RefreshTokenEntity.builder()
                .id(200L)
                .user(testUser)
                .tokenHash(tokenHash)
                .familyId(familyId)
                .revoked(true) // already revoked!
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        when(jwtService.isRefreshTokenValid(rawToken)).thenReturn(true);
        mockRefreshClaims(rawToken, familyId);
        when(jwtService.hashToken(rawToken)).thenReturn(tokenHash);
        when(refreshTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(compromisedToken));

        RefreshTokenRequest request = new RefreshTokenRequest(rawToken);

        assertThatThrownBy(() -> authService.refreshToken(request))
                .isInstanceOf(TokenCompromisedException.class)
                .hasMessageContaining("Token reuse detected");

        // Verify that all tokens for that family were revoked
        verify(refreshTokenRepository).revokeAllByFamilyId(familyId);
    }

    private void mockRefreshClaims(String rawToken, String familyId) {
        var claims = Jwts.claims().add("userId", testUser.getUuid().toString())
                .add("familyId", familyId).build();
        when(jwtService.extractRefreshTokenClaims(rawToken)).thenReturn(claims);
        when(userRepository.findByUuidForUpdate(testUser.getUuid())).thenReturn(Optional.of(testUser));
    }
}
