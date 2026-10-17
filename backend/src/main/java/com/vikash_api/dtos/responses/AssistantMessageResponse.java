package com.vikash_api.dtos.responses;
import java.time.Instant;
import java.util.UUID;
public record AssistantMessageResponse(UUID conversationId, String status, Receipt message, String notice, Reply reply) {
    public AssistantMessageResponse(UUID conversationId, String status, Receipt message, String notice) {
        this(conversationId, status, message, notice, null);
    }
    public record Receipt(UUID id, String clientMessageId, String role, String status, Instant receivedAt) {}
    public record Reply(UUID id, String role, String content, Instant createdAt, com.vikash_api.assistant.FinancialReplyPresentation presentation) {
        public Reply(UUID id,String role,String content,Instant createdAt) { this(id,role,content,createdAt,null); }
    }
}
