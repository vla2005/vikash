package com.vikash_api.services;

import com.vikash_api.dtos.requests.AssistantMessageRequest;
import com.vikash_api.dtos.responses.AssistantMessageResponse;
import com.vikash_api.entities.*;
import com.vikash_api.exceptions.AssistantQuestionException;
import com.vikash_api.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor 
public class AssistantQuestionService {
    private final AuthenticatedUserService authenticatedUserService;
    private final UserRepository users;
    private final AssistantConversationRepository conversations;
    private final AssistantMessageRepository messages;

    public record Accepted(AssistantMessageResponse response, boolean replayed, Long userId) {}

    @Transactional
    public Accepted receive(AssistantMessageRequest request, String idempotencyKey) {
        if (!request.clientMessageId().equals(idempotencyKey)) {
            throw new AssistantQuestionException(HttpStatus.BAD_REQUEST, "ASSISTANT_MESSAGE_KEY_MISMATCH",
                    "A identificação do envio não corresponde à mensagem. Tente novamente.");
        }
        UserEntity authenticated = authenticatedUserService.getCurrentUser();
        // Serializa somente as gravações deste usuário: primeira entrega e reenvios
        // concorrentes compartilham a mesma transação e as mesmas restrições únicas.
        UserEntity user = users.findByUuidForUpdate(authenticated.getUuid()).orElseThrow(() ->
                new AssistantQuestionException(HttpStatus.UNAUTHORIZED, "ASSISTANT_SESSION_EXPIRED", "Entre novamente para enviar sua pergunta."));
        log.info("event=assistant.question.validated chars={}", request.content().length());
        AssistantConversationEntity conversation;
        if (request.conversationId() != null) {
            conversation = conversations.findByUuidAndUserId(request.conversationId(), user.getId()).orElseThrow(() ->
                    new AssistantQuestionException(HttpStatus.NOT_FOUND, "ASSISTANT_CONVERSATION_NOT_FOUND", "Conversa não encontrada. Inicie uma nova conversa."));
            if (!conversation.getClientId().equals(request.clientConversationId())) {
                throw new AssistantQuestionException(HttpStatus.CONFLICT, "ASSISTANT_CONVERSATION_CONFLICT", "A identificação da conversa mudou. Inicie uma nova conversa.");
            }
        } else {
            conversation = conversations.findByUserIdAndClientId(user.getId(), request.clientConversationId()).orElse(null);
        }
        if (conversation != null) {
            var previous = messages.findByConversationIdAndClientId(conversation.getId(), request.clientMessageId());
            if (previous.isPresent()) {
                if (!previous.get().getContent().equals(request.content())) {
                    throw new AssistantQuestionException(HttpStatus.CONFLICT, "ASSISTANT_MESSAGE_CONFLICT", "Este envio já foi usado para outra pergunta. Envie a pergunta como uma nova mensagem.");
                }
                log.info("event=assistant.question.replayed conversationId={} messageId={}", conversation.getUuid(), previous.get().getUuid());
                return new Accepted(receipt(conversation, previous.get()), true, user.getId());
            }
            if (messages.countByConversationId(conversation.getId()) +
                    messages.countByConversationIdAndRoleAndReplyUuidIsNull(conversation.getId(), "user") > 198) {
                throw new AssistantQuestionException(HttpStatus.CONFLICT, "ASSISTANT_CONVERSATION_LIMIT", "Esta conversa atingiu o limite de mensagens. Inicie uma nova conversa.");
            }
        } else {
            if (conversations.countByUserId(user.getId()) >= 50) {
                throw new AssistantQuestionException(HttpStatus.CONFLICT, "ASSISTANT_HISTORY_LIMIT", "Você atingiu o limite de 50 conversas salvas na API.");
            }
            conversation = new AssistantConversationEntity();
            conversation.setUuid(UUID.randomUUID());
            conversation.setClientId(request.clientConversationId());
            conversation.setUser(user);
            String title = request.content().replaceAll("\\s+", " ");
            int titleEnd = Math.min(64, title.length());
            if (titleEnd > 0 && Character.isHighSurrogate(title.charAt(titleEnd - 1))) titleEnd--;
            conversation.setTitle(title.substring(0, titleEnd));
            conversation.setCreatedAt(Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS));
            conversation.setUpdatedAt(conversation.getCreatedAt());
            conversations.save(conversation);
        }
        AssistantMessageEntity message = new AssistantMessageEntity();
        message.setUuid(UUID.randomUUID());
        message.setConversation(conversation);
        message.setClientId(request.clientMessageId());
        message.setRole("user");
        message.setContent(request.content());
        message.setStatus("received");
        message.setCreatedAt(Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS));
        messages.save(message);
        conversation.setUpdatedAt(message.getCreatedAt());
        log.info("event=assistant.question.saved conversationId={} messageId={} chars={} stage=question_received",
                conversation.getUuid(), message.getUuid(), message.getContent().length());
        return new Accepted(receipt(conversation, message), false, user.getId());
    }

    private AssistantMessageResponse receipt(AssistantConversationEntity conversation, AssistantMessageEntity message) {
        return new AssistantMessageResponse(conversation.getUuid(), "received",
                new AssistantMessageResponse.Receipt(message.getUuid(), message.getClientId(), message.getRole(), "received", message.getCreatedAt()),
                "Pergunta recebida e salva. As respostas da IA ainda não estão disponíveis nesta etapa.");
    }
}
