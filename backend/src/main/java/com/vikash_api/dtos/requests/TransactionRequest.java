package com.vikash_api.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TransactionRequest(
    @NotBlank(message = "Informe a transcrição.")
    @Size(max = 5000, message = "A transcrição deve ter até 5.000 caracteres.")
    String transcription
) {
    public TransactionRequest {
        if (transcription != null) { transcription = transcription.trim(); }
    }
}
