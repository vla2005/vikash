package com.vikash_api.controllers;

import com.vikash_api.dtos.requests.LoginRequest;
import com.vikash_api.dtos.requests.RefreshTokenRequest;
import com.vikash_api.dtos.requests.RegisterRequest;
import com.vikash_api.dtos.requests.ForgotPasswordRequest;
import com.vikash_api.dtos.requests.ResetPasswordRequest;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.dtos.responses.UserResponse;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.services.AuthService;

import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.OK)
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request);
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.OK)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        AuthResponse response = authService.login(request, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody(required = false) RefreshTokenRequest request,
            HttpServletRequest httpRequest) {
        // A sessão vem do Bearer autenticado, nunca de um refresh token de outra sessão.
        String authorization = httpRequest.getHeader("Authorization");
        String accessToken = authorization != null && authorization.startsWith("Bearer ")
                ? authorization.substring(7) : null;
        authService.logout(accessToken);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal UserEntity user) {
        return ResponseEntity.ok(authService.getProfile(user));
    }
}
