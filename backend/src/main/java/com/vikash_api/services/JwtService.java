package com.vikash_api.services;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.vikash_api.entities.UserEntity;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey accessTokenKey;
    private final SecretKey refreshTokenKey;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtService(
            @Value("${security.jwt.access-token-secret}") String accessSecret,
            @Value("${security.jwt.refresh-token-secret}") String refreshSecret,
            @Value("${security.jwt.access-token-expiration-ms:900000}") long accessTokenExpirationMs,
            @Value("${security.jwt.refresh-token-expiration-ms:604800000}") long refreshTokenExpirationMs) {
        this.accessTokenKey = parseSecretKey(accessSecret);
        this.refreshTokenKey = parseSecretKey(refreshSecret);
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    private SecretKey parseSecretKey(String secret) {
        byte[] keyBytes;
        try {
            keyBytes = HexFormat.of().parseHex(secret);
        } catch (Exception e1) {
            try {
                keyBytes = Decoders.BASE64.decode(secret);
            } catch (Exception e2) {
                keyBytes = secret.getBytes(StandardCharsets.UTF_8);
            }
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(UserEntity user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpirationMs);

        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getUuid().toString())
                .claim("name", user.getName())
                .claim("role", user.getRole().name())
                .id(UUID.randomUUID().toString()) // unique JTI
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(accessTokenKey)
                .compact();
    }

    public String generateRefreshToken(UserEntity user, String familyId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshTokenExpirationMs);

        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getUuid().toString())
                .claim("familyId", familyId)
                .id(UUID.randomUUID().toString()) // unique JTI
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(refreshTokenKey)
                .compact();
    }

    public Claims extractAccessTokenClaims(String token) {
        return Jwts.parser()
                .verifyWith(accessTokenKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Claims extractRefreshTokenClaims(String token) {
        return Jwts.parser()
                .verifyWith(refreshTokenKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractUsernameFromAccessToken(String token) {
        return extractAccessTokenClaims(token).getSubject();
    }

    public String extractUsernameFromRefreshToken(String token) {
        return extractRefreshTokenClaims(token).getSubject();
    }

    public boolean isAccessTokenValid(String token) {
        try {
            Claims claims = extractAccessTokenClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean isRefreshTokenValid(String token) {
        try {
            Claims claims = extractRefreshTokenClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public long getAccessTokenExpirationMs() {
        return accessTokenExpirationMs;
    }

    public long getRefreshTokenExpirationMs() {
        return refreshTokenExpirationMs;
    }

    public String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}
