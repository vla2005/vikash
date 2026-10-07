package com.vikash_api.services;

import java.util.Locale;
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

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final PasswordEncoder passwordEncoder;
    private final AuthenticatedUserService authenticatedUserService;
    private final UserRepository userRepository;

    @Transactional
    public UserResponse update(UserRequest request) {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();

        String email = request.email().trim().toLowerCase(Locale.ROOT);

        if (!email.equalsIgnoreCase(currentUser.getEmail())
                && userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Este email já está sendo utilizado");
        }

        currentUser.setName(request.name());
        currentUser.setEmail(email);
        UserEntity savedUser = userRepository.save(currentUser);
        return UserResponse.fromEntity(savedUser);
    }

    @Transactional
    public void updatePassword(UpdatePasswordRequest request){
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        if (!passwordEncoder.matches(request.password(), currentUser.getPassword())) {
            throw new InvalidCredentialsException("As senhas não coincidem");
        }

        currentUser.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(currentUser);
    }
}
