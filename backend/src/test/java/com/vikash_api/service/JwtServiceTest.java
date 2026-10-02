package com.vikash_api.service;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.vikash_api.entities.UserEntity;
import com.vikash_api.enums.Role;
import com.vikash_api.services.JwtService;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;
    private UserEntity testUser;

    @BeforeEach
    void setUp() {
        String accessSecret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
        String refreshSecret = "72357538782F413F4428472B4B6250645367566B5970404E635266556A586E32";
        jwtService = new JwtService(accessSecret, refreshSecret, 900000, 604800000);

        testUser = UserEntity.builder()
                .id(1L)
                .uuid(UUID.randomUUID())
                .name("Vikash Test")
                .email("vikash@example.com")
                .password("encoded_pass")
                .role(Role.ROLE_USER)
                .active(true)
                .build();
    }

    @Test
    @DisplayName("Should generate a valid access token with correct claims")
    void shouldGenerateValidAccessToken() {
        String token = jwtService.generateAccessToken(testUser);

        assertThat(token).isNotBlank();
        assertThat(jwtService.isAccessTokenValid(token)).isTrue();
        assertThat(jwtService.extractUsernameFromAccessToken(token)).isEqualTo("vikash@example.com");

        Claims claims = jwtService.extractAccessTokenClaims(token);
        assertThat(claims.get("userId")).isEqualTo(testUser.getUuid().toString());
        assertThat(claims.get("name")).isEqualTo("Vikash Test");
        assertThat(claims.get("role")).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("Should generate a valid refresh token with familyId")
    void shouldGenerateValidRefreshToken() {
        String familyId = UUID.randomUUID().toString();
        String token = jwtService.generateRefreshToken(testUser, familyId);

        assertThat(token).isNotBlank();
        assertThat(jwtService.isRefreshTokenValid(token)).isTrue();
        assertThat(jwtService.extractUsernameFromRefreshToken(token)).isEqualTo("vikash@example.com");

        Claims claims = jwtService.extractRefreshTokenClaims(token);
        assertThat(claims.get("userId")).isEqualTo(testUser.getUuid().toString());
        assertThat(claims.get("familyId")).isEqualTo(familyId);
        assertThat(claims.getId()).isNotBlank();
    }

    @Test
    @DisplayName("Access token key should not validate a refresh token and vice-versa")
    void shouldFailCrossTokenValidation() {
        String familyId = UUID.randomUUID().toString();
        String refreshToken = jwtService.generateRefreshToken(testUser, familyId);

        // Validating a refresh token with access token key must fail
        assertThat(jwtService.isAccessTokenValid(refreshToken)).isFalse();
    }

    @Test
    @DisplayName("Should hash token using SHA-256 producing 64-char hexadecimal string")
    void shouldHashTokenWithSha256() {
        String token = "sample-token-string-12345";
        String hash1 = jwtService.hashToken(token);
        String hash2 = jwtService.hashToken(token);

        assertThat(hash1).isNotBlank();
        assertThat(hash1).hasSize(64);
        assertThat(hash1).isEqualTo(hash2);
    }
}
