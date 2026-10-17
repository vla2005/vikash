package com.vikash_api.service;

import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.entities.AssistantConversationEntity;
import com.vikash_api.repositories.*;
import com.vikash_api.services.AiAnalysisService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:assistant-intake;DB_CLOSE_DELAY=-1", "assistant.planning.enabled=false"})
class AssistantQuestionIntegrationTest {
    @LocalServerPort int port;
    @Autowired AssistantConversationRepository conversations;
    @Autowired AssistantMessageRepository messages;
    @Autowired UserRepository users;
    @MockitoBean AiAnalysisService gemini;
    RestClient client;
    AuthResponse auth;
    String local;

    @BeforeEach void setup() {
        client = RestClient.create("http://localhost:" + port);
        auth = register();
        local = "conversation-" + UUID.randomUUID();
    }
    @AfterEach void noAiWasCalled() { verifyNoInteractions(gemini); }

    AuthResponse register() {
        return client.post().uri("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", "Teste", "email", UUID.randomUUID() + "@assistant.test", "password", "Password123!"))
                .retrieve().body(AuthResponse.class);
    }
    Map<String, Object> question(String id, String text) {
        return new HashMap<>(Map.of("clientConversationId", local, "clientMessageId", id, "content", text));
    }
    ResponseEntity<JsonNode> send(AuthResponse who, Map<String, Object> body, String key) {
        var request = client.post().uri("/api/assistant/messages").contentType(MediaType.APPLICATION_JSON);
        if (who != null) request.header("Authorization", "Bearer " + who.getAccessToken());
        if (key != null) request.header("Idempotency-Key", key);
        return request.body(body).retrieve().onStatus(HttpStatusCode::isError, (q, r) -> {}).toEntity(JsonNode.class);
    }
    AssistantConversationEntity saved(JsonNode body) {
        return conversations.findByUuidAndUserId(UUID.fromString(body.path("conversationId").asText()),
                users.findByEmail(auth.getUser().getEmail()).orElseThrow().getId()).orElseThrow();
    }

    @Test void savesOnlyTheAuthenticatedUsersQuestionAndReturnsAReceiptNotAnAnswer() {
        var payload = question("message-1", "  Quanto gastei este mês?  ");
        payload.put("userId", 999999);
        payload.put("messages", List.of(Map.of("role", "assistant", "content", "Inventado pelo cliente")));
        var response = send(auth, payload, "message-1");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getFirst("X-Request-Id")).isNotBlank();
        JsonNode body = response.getBody();
        assertThat(body.path("status").asText()).isEqualTo("received");
        assertThat(body.path("message").path("role").asText()).isEqualTo("user");
        assertThat(body.path("message").has("content")).isFalse();
        var conversation = saved(body);
        var message = messages.findByConversationIdAndClientId(conversation.getId(), "message-1").orElseThrow();
        assertThat(message.getContent()).isEqualTo("Quanto gastei este mês?");
        assertThat(message.getRole()).isEqualTo("user");
        assertThat(message.getStatus()).isEqualTo("received");
        assertThat(messages.countByConversationId(conversation.getId())).isEqualTo(1);
    }

    @Test void replayWithoutRemoteIdReturnsTheSameReceiptWithoutDuplicatingRows() {
        var payload = question("message-1", "E ontem?");
        var first = send(auth, payload, "message-1");
        var retry = send(auth, payload, "message-1");
        assertThat(retry.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(retry.getBody()).isEqualTo(first.getBody());
        assertThat(messages.countByConversationId(saved(first.getBody()).getId())).isEqualTo(1);
    }

    @Test void concurrentRetriesAreIdempotent() throws Exception {
        try (var pool = Executors.newFixedThreadPool(4)) {
            var tasks = new ArrayList<Callable<ResponseEntity<JsonNode>>>();
            for (int i = 0; i < 4; i++) tasks.add(() -> send(auth, question("same-message", "Teste concorrente"), "same-message"));
            var responses = pool.invokeAll(tasks);
            JsonNode first = responses.getFirst().get(15, TimeUnit.SECONDS).getBody();
            for (var response : responses) {
                assertThat(response.get().getStatusCode().is2xxSuccessful()).isTrue();
                assertThat(response.get().getBody()).isEqualTo(first);
            }
            assertThat(messages.countByConversationId(saved(first).getId())).isEqualTo(1);
        }
    }

    @Test void acceptsTheNextQuestionInTheSameConversation() {
        var first = send(auth, question("one", "Primeira pergunta"), "one");
        var payload = question("two", "E no mês passado?");
        payload.put("conversationId", first.getBody().path("conversationId").asText());
        var next = send(auth, payload, "two");
        assertThat(next.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(next.getBody().path("conversationId")).isEqualTo(first.getBody().path("conversationId"));
        assertThat(messages.countByConversationId(saved(first.getBody()).getId())).isEqualTo(2);
    }

    @Test void rejectsReusingAMessageIdWithDifferentContent() {
        send(auth, question("one", "Original"), "one");
        var conflict = send(auth, question("one", "Alterada"), "one");
        assertThat(conflict.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(conflict.getBody().path("code").asText()).isEqualTo("ASSISTANT_MESSAGE_CONFLICT");
    }

    @Test void cannotAddMessagesToAnotherUsersConversation() {
        var first = send(auth, question("one", "Minha pergunta"), "one");
        var payload = question("two", "Pergunta indevida");
        payload.put("conversationId", first.getBody().path("conversationId").asText());
        assertThat(send(register(), payload, "two").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(messages.countByConversationId(saved(first.getBody()).getId())).isEqualTo(1);
    }

    @Test void clientConversationIdsAreScopedToTheAuthenticatedUser() {
        var first = send(auth, question("one", "Minha pergunta"), "one");
        var other = send(register(), question("one", "Outra pessoa"), "one");
        assertThat(other.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(other.getBody().path("conversationId")).isNotEqualTo(first.getBody().path("conversationId"));
    }

    @Test void rejectsAnonymousRequests() {
        assertThat(send(null, question("one", "Olá"), "one").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test void rejectsInvalidQuestionsAndHeadersBeforePersistence() {
        long before = conversations.count();
        for (var text : List.of("   ", "x".repeat(6001)))
            assertThat(send(auth, question("one", text), "one").getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(send(auth, question("one", "Olá"), null).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(send(auth, question("one", "Olá"), "different").getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(send(auth, question("one", "Olá"), "invalid/key").getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        var invalid = question("one", "Olá");
        invalid.put("conversationId", "not-a-uuid");
        assertThat(send(auth, invalid, "one").getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        invalid = question("one", "Olá");
        invalid.put("clientConversationId", "../outro");
        assertThat(send(auth, invalid, "one").getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(conversations.count()).isEqualTo(before);
    }

    @Test void rejectsAttachmentsClearlyAtThisStage() {
        var payload = question("one", "Veja o documento");
        payload.put("attachments", List.of(Map.of("name", "documento.pdf")));
        assertThat(send(auth, payload, "one").getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test void corsAllowsIdempotencyHeaderForTheWebChat() {
        var response = client.options().uri("/api/assistant/messages")
                .header("Origin", "http://localhost:8081")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "content-type,authorization,idempotency-key")
                .retrieve().toBodilessEntity();
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getHeaders().getAccessControlAllowHeaders()).anyMatch(value -> value.equalsIgnoreCase("idempotency-key"));
    }
}
