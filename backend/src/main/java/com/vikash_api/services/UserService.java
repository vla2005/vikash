package com.vikash_api.services;

import java.util.Locale;
import java.time.Instant;
import jakarta.persistence.EntityManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vikash_api.dtos.requests.UpdatePasswordRequest;
import com.vikash_api.dtos.requests.UserRequest;
import com.vikash_api.dtos.responses.UserResponse;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.exceptions.EmailAlreadyExistsException;
import com.vikash_api.exceptions.InvalidCredentialsException;
import com.vikash_api.repositories.UserRepository;
import com.vikash_api.repositories.PasswordResetTokenRepository;
import com.vikash_api.repositories.RefreshTokenRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final PasswordEncoder passwordEncoder;
    private final AuthenticatedUserService authenticatedUserService;
    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EntityManager entityManager;

    @Transactional
    public UserResponse update(UserRequest request) {
        UserEntity currentUser = getCurrentUserForUpdate();

        String email = request.email().trim().toLowerCase(Locale.ROOT);
        boolean emailChanged = !email.equals(currentUser.getEmail().trim().toLowerCase(Locale.ROOT));

        if (emailChanged && (request.password() == null || request.password().isBlank()
                || !passwordEncoder.matches(request.password(), currentUser.getPassword()))) {
            throw new InvalidCredentialsException("Confirme sua senha atual para alterar o e-mail.");
        }

        if (emailChanged
                && userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Este email já está sendo utilizado");
        }

        currentUser.setName(request.name());
        currentUser.setEmail(email);
        UserEntity savedUser = userRepository.save(currentUser);
        if (emailChanged) {
            passwordResetTokenRepository.markAllUsedByUser(currentUser, Instant.now());
        }
        return UserResponse.fromEntity(savedUser);
    }

    @Transactional
    public void updatePassword(UpdatePasswordRequest request){
        UserEntity currentUser = getCurrentUserForUpdate();
        if (!passwordEncoder.matches(request.password(), currentUser.getPassword())) {
            throw new InvalidCredentialsException("As senhas não coincidem");
        }

        currentUser.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(currentUser);
        passwordResetTokenRepository.markAllUsedByUser(currentUser, Instant.now());
        refreshTokenRepository.revokeAllByUser(currentUser);
    }

    private UserEntity getCurrentUserForUpdate() {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        UserEntity lockedUser = userRepository.findByUuidForUpdate(currentUser.getUuid())
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado."));
        // Recarrega após esperar o lock: outra requisição pode ter alterado a senha.
        entityManager.refresh(lockedUser);
        return lockedUser;
    }
}
