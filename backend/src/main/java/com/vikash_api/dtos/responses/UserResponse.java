package com.vikash_api.dtos.responses;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

import com.vikash_api.entities.UserEntity;
import com.vikash_api.enums.Role;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private UUID uuid;
    private String name;
    private String email;
    private Role role;
    private LocalDateTime createdAt;

    public static UserResponse fromEntity(UserEntity user) {
        return UserResponse.builder()
                .uuid(user.getUuid())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
