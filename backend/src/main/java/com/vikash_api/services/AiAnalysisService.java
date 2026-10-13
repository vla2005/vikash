package com.vikash_api.services;

import java.time.ZoneId;
import java.nio.charset.StandardCharsets;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.vikash_api.dtos.requests.AiAnalysisContext;
import com.vikash_api.dtos.responses.AiAnalysisResponse;
import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.logging.SafeDiagnostics;
import org.springframework.web.client.RestClientResponseException;
import com.vikash_api.enums.TransactionType;
import com.vikash_api.enums.VoiceAnalysisField;
import com.vikash_api.exceptions.AiAnalysisUnavailableException;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@lombok.extern.slf4j.Slf4j
@Service
public class AiAnalysisService {
    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final String apiUrl;
    private final String apiKey;
    @Value("${security.ai.max-input-bytes:100000}")
    private int maxInputBytes = 100_000;
    @Value("${security.ai.max-output-tokens:2048}")
    private int maxOutputTokens = 2048;

    @jakarta.annotation.PostConstruct
    void validateLimits() {
        if (maxInputBytes < 1 || maxOutputTokens < 1) {
            throw new IllegalArgumentException("Os limites de tamanho da IA devem ser positivos.");
        }
    }

    public AiAnalysisService(
            ObjectMapper objectMapper,
            @Value("${gemini.api.url}") String apiUrl,
            @Value("${gemini.api.key}") String apiKey) {

        this.objectMapper = objectMapper;
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;

        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(30_000);

        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .build();
    }

    public AiAnalysisResponse analyze(
            String transcription,
            AiAnalysisContext context) {

        long started = System.nanoTime();
        log.info("event=gemini.analysis.start model={}", modelName());
        if (transcription == null || transcription.isBlank()) {
            throw new IllegalArgumentException(
                    "A transcrição não pode estar vazia.");
        }

        if (context == null) {
            throw new IllegalArgumentException(
                    "O contexto da análise é obrigatório.");
        }

        var input = Map.of(
                "transcription", transcription.trim(),
                "accounts", context.accounts(),
                "creditCards", context.creditCards(),
                "creditCardInvoices", context.creditCardInvoices(),
                "defaultCategories", context.defaultCategories(),
                "customCategories", context.customCategories(),
                "transactionTypes", transactionTypes(),
                "paymentMethods", paymentMethods(),
                "currentDateTime", ZonedDateTime.now(
                        ZoneId.of("America/Sao_Paulo")).toString());

        String inputJson = objectMapper.writeValueAsString(input);
        int inputBytes = inputJson.getBytes(StandardCharsets.UTF_8).length;
        log.info("event=gemini.request.prepare inputBytes={} maxInputBytes={} maxOutputTokens={}", inputBytes, maxInputBytes, maxOutputTokens);
        if (inputBytes > maxInputBytes) {
            log.info("event=gemini.request.rejected reason=INPUT_SIZE_LIMIT");
            throw new com.vikash_api.exceptions.InvalidTransactionException(
                    "O contexto da análise excedeu o limite de tamanho permitido.");
        }
        var body = Map.of(
                "systemInstruction", Map.of(
                        "parts", List.of(
                                Map.of("text", instructions()))),
                "contents", List.of(
                        Map.of(
                                "role", "user",
                                "parts", List.of(
                                        Map.of(
                                                "text",
                                                inputJson)))),
                "generationConfig", Map.of(
                        "candidateCount", 1,
                        "maxOutputTokens", maxOutputTokens,
                        "responseFormat", Map.of(
                                "text", Map.of(
                                        "mimeType", "APPLICATION_JSON",
                                        "schema", responseSchema()))));

        JsonNode response;

        try {
            log.info("event=gemini.request.send model={}", modelName());
            response = restClient.post()
                    .uri(apiUrl)
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

        } catch (RestClientException exception) {
            log.info("event=gemini.request.failed model={} providerReason={} durationMs={}", modelName(), providerReason(exception), SafeDiagnostics.elapsedMs(started));
            SafeDiagnostics.failure(log, "gemini.transport.failed", "Gemini.generateContent", exception, SafeDiagnostics.elapsedMs(started), false);
            throw new AiAnalysisUnavailableException(
                    "Não foi possível consultar o Gemini.",
                    exception);
        }

        if (response == null) {
            log.info("event=gemini.response.empty durationMs={}", SafeDiagnostics.elapsedMs(started));
            throw new AiAnalysisUnavailableException(
                    "O Gemini retornou uma resposta vazia.");
        }

        var candidate = response.path("candidates").path(0);
        String finish = candidate.path("finishReason").asText("");
        String block = response.path("promptFeedback").path("blockReason").asText("");
        log.info("event=gemini.response.received providerStatus=200 finishReason={} blockReason={} durationMs={}",
                safeReason(finish), safeReason(block), SafeDiagnostics.elapsedMs(started));

        if (!"STOP".equals(
                candidate.path("finishReason").asText())) {

            throw new AiAnalysisUnavailableException(
                    "O Gemini não concluiu a análise.");
        }

        var resultText = new StringBuilder();

        for (var part : candidate.path("content").path("parts")) {
            if (!part.path("thought").asBoolean(false)) {
                resultText.append(part.path("text").asText(""));
            }
        }

        if (resultText.isEmpty()) {
            log.info("event=gemini.response.rejected reason=NO_ANALYSIS_CONTENT");
            throw new AiAnalysisUnavailableException(
                    "O Gemini não retornou o resultado da análise.");
        }

        try {
            JsonNode analysis = objectMapper.readTree(
                    resultText.toString());

            if (analysis == null || !analysis.isObject()) {
                throw new AiAnalysisUnavailableException(
                        "O resultado da análise não é um objeto JSON.");
            }

            var installmentCount = analysis.get("installmentCount");
            if (installmentCount != null && !installmentCount.isNull() && !installmentCount.isIntegralNumber()) {
                throw new AiAnalysisUnavailableException("A quantidade de parcelas deve ser um número inteiro.");
            }

            var parsed = objectMapper.readValue(resultText.toString(), AiAnalysisResponse.class);
            if (parsed.missingFields() != null) {
                parsed.missingFields().forEach(VoiceAnalysisField::fromField);
            }
            log.info("event=gemini.analysis.parsed hasType={} hasPaymentMethod={} missingFields={} durationMs={}", parsed.type() != null, parsed.paymentMethod() != null, parsed.missingFields(), SafeDiagnostics.elapsedMs(started));
            return parsed;

        } catch (RuntimeException exception) {
            SafeDiagnostics.failure(log, "gemini.response.invalid", "Gemini.parseAnalysis", exception, SafeDiagnostics.elapsedMs(started), false);
            throw new AiAnalysisUnavailableException(
                    "O Gemini retornou uma análise inválida.",
                    exception);
        }
    }

    private String modelName() {
        try {
            var match = java.util.regex.Pattern.compile("/models/(gemini-[a-zA-Z0-9.-]+):generateContent")
                    .matcher(java.net.URI.create(apiUrl).getPath());
            return match.find() ? match.group(1) : "configured";
        } catch (IllegalArgumentException ex) { return "configured"; }
    }

    private String providerReason(RestClientException exception) {
        if (!(exception instanceof RestClientResponseException response)) return SafeDiagnostics.details(exception).reason();
        try {
            String body = response.getResponseBodyAsString();
            if (body.length() > 65_536) return "PROVIDER_ERROR";
            var error = objectMapper.readTree(body).path("error");
            String message = error.path("message").asText("").toLowerCase(java.util.Locale.ROOT);
            // Só a classificação é emitida, nunca a mensagem nem o corpo do provedor.
            if (message.contains("high demand")) return "HIGH_DEMAND";
            if (message.contains("api key not valid")) return "API_KEY_REJECTED";
            if (message.contains("no longer available") || message.contains("model") && message.contains("not found")) return "MODEL_UNAVAILABLE";
            if (message.contains("quota") || message.contains("rate limit")) return "PROVIDER_QUOTA";
            if (message.contains("unknown name") || message.contains("schema")) return "REQUEST_SCHEMA_REJECTED";
            return safeReason(error.path("status").asText(""));
        } catch (RuntimeException parseError) { return "PROVIDER_ERROR"; }
    }

    private String safeReason(String value) {
        return java.util.Set.of("STOP", "MAX_TOKENS", "SAFETY", "RECITATION", "OTHER", "BLOCKLIST", "PROHIBITED_CONTENT",
                "SPII", "MALFORMED_FUNCTION_CALL", "INVALID_ARGUMENT", "UNAVAILABLE", "RESOURCE_EXHAUSTED",
                "PERMISSION_DENIED", "UNAUTHENTICATED", "NOT_FOUND", "INTERNAL", "DEADLINE_EXCEEDED").contains(value) ? value : "UNSPECIFIED";
    }

    private String instructions() {
        try {
            return new org.springframework.core.io.ClassPathResource("prompts/transaction-analysis.txt")
                    .getContentAsString(StandardCharsets.UTF_8);
        } catch (java.io.IOException ex) {
            throw new AiAnalysisUnavailableException("Não foi possível carregar as instruções da análise.", ex);
        }
    }

    private Map<String, Object> responseSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.ofEntries(
                        Map.entry("description", nullable("string")),
                        Map.entry("amount", nullable("number")),
                        Map.entry("type", nullableEnum(transactionTypes())),
                        Map.entry("paymentMethod", nullableEnum(paymentMethods())),
                        Map.entry("occurredAt", nullable("string")),
                        Map.entry("accountUuid", nullable("string")),
                        Map.entry("creditCardUuid", nullable("string")),
                        Map.entry("creditCardInvoiceUuid", nullable("string")),
                        Map.entry("destinationAccountUuid", nullable("string")),
                        Map.entry("defaultCategoryName", nullable("string")),
                        Map.entry("customCategoryUuid", nullable("string")),
                        Map.entry("installmentCount", Map.of("type", List.of("integer", "null"), "minimum", 1, "maximum", 120)),
                        Map.entry("missingFields", Map.of(
                                "type", "array",
                                "description", "Todos os campos ausentes, ambíguos ou inválidos; [] somente quando o lançamento estiver completo.",
                                "items", Map.of("type", "string", "enum", VoiceAnalysisField.fieldNames())))),
                "required", List.of(
                        "description",
                        "amount",
                        "type",
                        "paymentMethod",
                        "occurredAt",
                        "accountUuid",
                        "creditCardUuid",
                        "creditCardInvoiceUuid",
                        "destinationAccountUuid",
                        "defaultCategoryName",
                        "customCategoryUuid",
                        "installmentCount",
                        "missingFields"),
                "additionalProperties", false);
    }

    private Map<String, Object> nullable(String type) {
        return Map.of("type", List.of(type, "null"));
    }

    private List<String> transactionTypes() {
        return Arrays.stream(TransactionType.values()).map(Enum::name).toList();
    }

    private List<String> paymentMethods() {
        return Arrays.stream(PaymentMethod.values()).map(Enum::name).toList();
    }

    private Map<String, Object> nullableEnum(List<String> values) {
        return Map.of(
                "anyOf", List.of(
                        Map.of("type", "string", "enum", values),
                        Map.of("type", "null")));
    }
}
