package com.vikash_api.services;

import com.vikash_api.entities.UserEntity;
import com.vikash_api.repositories.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthenticatedUserService {

    private final UserRepository userRepository;

    /**
     * Retorna a entidade User completa e gerenciada do usuário logado na requisição atual.
     * Lança AccessDeniedException se não houver autenticação ou se o usuário for anônimo.
     */
    public UserEntity getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            throw new AccessDeniedException("Nenhum usuário autenticado encontrado na requisição atual.");
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof UserEntity user) {
            return userRepository.findById(user.getId())
                    .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado com ID: " + user.getId()));
        } else if (principal instanceof UserDetails userDetails) {
            return userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado com e-mail: " + userDetails.getUsername()));
        } else if (principal instanceof String email) {
            return userRepository.findByEmail(email)
                    .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado com e-mail: " + email));
        }

        throw new AccessDeniedException("Tipo de autenticação não suportado: " + principal.getClass().getName());
    }

    /**
     * Retorna apenas o ID (Long) do usuário autenticado.
     */
    public Long getCurrentUserId() {
        return getCurrentUser().getId();
    }

    /**
     * Retorna o e-mail do usuário autenticado.
     */
    public String getCurrentUserEmail() {
        return getCurrentUser().getEmail();
    }

    /**
     * Versão segura que retorna Optional<User>, útil para endpoints públicos ou condicionais.
     */
    public Optional<UserEntity> getCurrentUserOptional() {
        try {
            return Optional.of(getCurrentUser());
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
