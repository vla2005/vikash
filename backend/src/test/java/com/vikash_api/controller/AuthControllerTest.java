package com.vikash_api.controller;

import com.vikash_api.controllers.AuthController;
import com.vikash_api.dtos.requests.LoginRequest;
import com.vikash_api.dtos.requests.RefreshTokenRequest;
import com.vikash_api.dtos.requests.RegisterRequest;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.dtos.responses.UserResponse;
import com.vikash_api.enums.Role;
import com.vikash_api.exceptions.GlobalExceptionHandler;
import com.vikash_api.services.AuthService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Mock private com.vikash_api.services.RegistrationService registrationService;
    @Mock private com.vikash_api.services.RegistrationAttemptService registrationAttempts;

    @Test
    void registrationReturnsPendingProofWithoutTokens() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Vikash\",\"email\":\"vikash@example.com\",\"password\":\"Secret123!\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.challengeId").isString())
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.user").doesNotExist());
        org.mockito.Mockito.verifyNoInteractions(authService);
    }

    @Test
    void saturatedMailQueueKeepsTheSamePublicContract() throws Exception {
        org.mockito.Mockito.doThrow(new org.springframework.core.task.TaskRejectedException("synthetic queue saturation"))
                .when(registrationService).prepare(any(), any());
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Vikash\",\"email\":\"vikash@example.com\",\"password\":\"Secret123!\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.challengeId").isString())
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.expiresIn").value(900));
        org.mockito.Mockito.verifyNoInteractions(authService);
    }

    @Test
    @DisplayName("POST /api/auth/register - Should return 400 Bad Request on validation failure")
    void shouldFailValidationOnRegister() throws Exception {
        RegisterRequest invalidRequest = RegisterRequest.builder()
                .name("")
                .email("not-an-email")
                .password("123") // too short
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Error"))
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    @DisplayName("POST /api/auth/login - Should return 200 OK and tokens")
    void shouldLoginSuccessfully() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("vikash@example.com")
                .password("secret123")
                .build();

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("access_token_abc")
                .refreshToken("refresh_token_xyz")
                .tokenType("Bearer")
                .expiresIn(900)
                .user(UserResponse.builder()
                        .uuid(UUID.randomUUID())
                        .name("Vikash")
                        .email("vikash@example.com")
                        .role(Role.ROLE_USER)
                        .build())
                .build();

        when(authService.login(any(LoginRequest.class), anyString())).thenReturn(authResponse);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access_token_abc"))
                .andExpect(jsonPath("$.refreshToken").value("refresh_token_xyz"));
    }

    @Test
    @DisplayName("POST /api/auth/refresh - Should return 200 OK and rotated tokens")
    void shouldRefreshTokenSuccessfully() throws Exception {
        RefreshTokenRequest request = new RefreshTokenRequest("old_refresh_token");

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("new_access_token")
                .refreshToken("new_refresh_token")
                .tokenType("Bearer")
                .expiresIn(900)
                .build();

        when(authService.refreshToken(any(RefreshTokenRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new_access_token"))
                .andExpect(jsonPath("$.refreshToken").value("new_refresh_token"));
    }
}
