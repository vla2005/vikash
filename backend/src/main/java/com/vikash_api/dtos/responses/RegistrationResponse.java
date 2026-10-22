package com.vikash_api.dtos.responses;

import java.util.UUID;

public record RegistrationResponse(UUID challengeId, String message, int expiresIn) {
    public RegistrationResponse(UUID challengeId) {
        this(challengeId, "Se este e-mail puder ser cadastrado, enviaremos um código de confirmação. Se já tiver conta, entre ou recupere sua senha.", 900);
    }
}
