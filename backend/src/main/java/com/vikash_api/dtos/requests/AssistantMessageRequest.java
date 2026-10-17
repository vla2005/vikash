package com.vikash_api.dtos.requests;

import com.vikash_api.validation.Utf8Size;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;

public record AssistantMessageRequest(
        UUID conversationId,
        @NotBlank @Size(max = 80) @Pattern(regexp = "[A-Za-z0-9_-]+") String clientConversationId,
        @NotBlank @Size(max = 80) @Pattern(regexp = "[A-Za-z0-9_-]+") String clientMessageId,
        @NotBlank(message = "Digite sua pergunta.")
        @Size(max = 6000, message = "A pergunta deve ter no máximo 6.000 caracteres.")
        @Utf8Size(max = 24000) String content,
        @Size(max = 0, message = "O envio de anexos ainda não está disponível nesta etapa. Envie uma pergunta em texto.") List<Object> attachments) {
    public AssistantMessageRequest {
        if (content != null) content = content.strip();
    }
}
