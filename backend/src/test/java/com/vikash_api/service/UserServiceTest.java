package com.vikash_api.service;

import com.vikash_api.dtos.requests.UpdatePasswordRequest;
import com.vikash_api.dtos.requests.UserRequest;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.enums.Role;
import com.vikash_api.exceptions.EmailAlreadyExistsException;
import com.vikash_api.exceptions.InvalidCredentialsException;
import com.vikash_api.repositories.UserRepository;
import com.vikash_api.repositories.PasswordResetTokenRepository;
import com.vikash_api.repositories.RefreshTokenRepository;
import jakarta.persistence.EntityManager;
import com.vikash_api.services.AuthenticatedUserService;
import com.vikash_api.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.LocalDateTime;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock AuthenticatedUserService authenticatedUserService;
    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock EntityManager entityManager;
    @InjectMocks UserService service;
    UserEntity user;

    @BeforeEach
    void setUp() {
        user = UserEntity.builder().id(1L).uuid(UUID.randomUUID()).name("Lívia Matos")
                .email("livia@example.com").password("stored-hash").role(Role.ROLE_USER)
                .createdAt(LocalDateTime.of(2026, 10, 1, 12, 0)).active(true).build();
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        lenient().when(userRepository.findByUuidForUpdate(user.getUuid())).thenReturn(java.util.Optional.of(user));
    }

    @Test
    void updatesAndNormalizesOnlyProfileFields() {
        when(userRepository.save(user)).thenReturn(user);
        when(passwordEncoder.matches(" Senha123! ", "stored-hash")).thenReturn(true);
        var response = service.update(new UserRequest(" Lívia Silva ", " NOVO@example.com ", " Senha123! "));

        assertThat(response.getName()).isEqualTo("Lívia Silva");
        assertThat(response.getEmail()).isEqualTo("novo@example.com");
        assertThat(response.getUuid()).isEqualTo(user.getUuid());
        assertThat(response.getRole()).isEqualTo(Role.ROLE_USER);
        assertThat(response.getCreatedAt()).isEqualTo(user.getCreatedAt());
        assertThat(user.getPassword()).isEqualTo("stored-hash");
        verify(userRepository).existsByEmail("novo@example.com");
        verify(passwordResetTokenRepository).markAllUsedByUser(eq(user), any());
        verify(entityManager).refresh(user);
    }

    @Test
    void acceptsTheUsersOwnEmailWhenOnlyTheNameChanges() {
        when(userRepository.save(user)).thenReturn(user);
        var response = service.update(new UserRequest("Lívia Silva", "livia@example.com"));
        assertThat(response.getName()).isEqualTo("Lívia Silva");
        verify(userRepository, never()).existsByEmail(anyString());
    }

    @Test
    void rejectsAnotherUsersEmailWithoutChangingTheProfile() {
        when(userRepository.existsByEmail("outro@example.com")).thenReturn(true);
        when(passwordEncoder.matches("Senha123!", "stored-hash")).thenReturn(true);
        assertThatThrownBy(() -> service.update(new UserRequest("Outro nome", " OUTRO@example.com ", "Senha123!")))
                .isInstanceOf(EmailAlreadyExistsException.class);
        assertThat(user.getName()).isEqualTo("Lívia Matos");
        assertThat(user.getEmail()).isEqualTo("livia@example.com");
        verify(userRepository, never()).save(any());
    }

    @Test
    void changingEmailRequiresTheCurrentPasswordBeforeAnyMutation() {
        for (String password : new String[] { null, "", "   ", "incorrect" }) {
            assertThatThrownBy(() -> service.update(new UserRequest("Outro nome", "novo@example.com", password)))
                    .isInstanceOf(InvalidCredentialsException.class);
        }
        assertThat(user.getEmail()).isEqualTo("livia@example.com");
        assertThat(user.getName()).isEqualTo("Lívia Matos");
        verify(userRepository, never()).save(any());
        verifyNoInteractions(passwordResetTokenRepository);
    }

    @Test
    void unicodeLookalikesDoNotBypassEmailReauthentication() {
        assertThatThrownBy(() -> service.update(new UserRequest("Lívia", "lıvia@example.com")))
                .isInstanceOf(InvalidCredentialsException.class);
        user.setEmail("silvia@example.com");
        assertThatThrownBy(() -> service.update(new UserRequest("Lívia", "ſilvia@example.com")))
                .isInstanceOf(InvalidCredentialsException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void emailCaseOnlyChangeDoesNotRequireAPasswordOrInvalidateLinks() {
        when(userRepository.save(user)).thenReturn(user);
        service.update(new UserRequest("Lívia", " LIVIA@example.com "));
        verifyNoInteractions(passwordEncoder, passwordResetTokenRepository);
    }

    @Test
    void reauthenticationUsesThePasswordReloadedAfterTheLock() {
        doAnswer(invocation -> { user.setPassword("changed-hash"); return null; }).when(entityManager).refresh(user);
        assertThatThrownBy(() -> service.update(new UserRequest("Lívia", "novo@example.com", "old-password")))
                .isInstanceOf(InvalidCredentialsException.class);
        verify(passwordEncoder).matches("old-password", "changed-hash");
        verify(userRepository, never()).save(any());
    }

    @Test
    void updatesPasswordUsingTheEncoderAndPreservesItsSpaces() {
        when(passwordEncoder.matches(" old123 ", "stored-hash")).thenReturn(true);
        when(passwordEncoder.encode(" Nova12345! ")).thenReturn("new-hash");
        service.updatePassword(new UpdatePasswordRequest(" old123 ", " Nova12345! "));
        assertThat(user.getPassword()).isEqualTo("new-hash");
        assertThat(user.getEmail()).isEqualTo("livia@example.com");
        verify(userRepository).save(user);
        verify(refreshTokenRepository).revokeAllByUser(user);
        verify(passwordResetTokenRepository).markAllUsedByUser(eq(user), any());
        verify(entityManager).refresh(user);
    }

    @Test
    void incorrectCurrentPasswordDoesNotEncodeOrSaveANewPassword() {
        assertThatThrownBy(() -> service.updatePassword(new UpdatePasswordRequest("incorrect", "Nova12345!")))
                .isInstanceOf(InvalidCredentialsException.class);
        assertThat(user.getPassword()).isEqualTo("stored-hash");
        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any());
        verifyNoInteractions(refreshTokenRepository, passwordResetTokenRepository);
    }
}
