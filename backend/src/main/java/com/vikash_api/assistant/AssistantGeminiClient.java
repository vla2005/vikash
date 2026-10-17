package com.vikash_api.assistant;

import com.vikash_api.exceptions.AssistantPlanningException;
import com.vikash_api.logging.SafeDiagnostics;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Slf4j @Service
public class AssistantGeminiClient {
    private final ObjectMapper mapper;
    private final FinancialCatalog catalog;
    private final AssistantMemory memory;
    private final RestClient client;
    private final String apiUrl;
    private final String apiKey;
    @Value("${assistant.gemini.max-input-bytes:100000}") private int maxInputBytes = 100000;
    @Value("${assistant.gemini.max-output-tokens:4096}") private int maxOutputTokens = 4096;
    private static final Set<String> KEYS = Set.of("catalogVersion", "decision", "interpretation", "sql", "parameters", "views", "clarification");
    private static final Set<String> TYPES = Set.of("date", "timestamp", "text", "decimal", "integer");

    public AssistantGeminiClient(ObjectMapper mapper,FinancialCatalog catalog,String apiUrl,String apiKey) {
        this(mapper,catalog,new AssistantMemory(mapper),apiUrl,apiKey);
    }
    @org.springframework.beans.factory.annotation.Autowired
    public AssistantGeminiClient(ObjectMapper mapper, FinancialCatalog catalog,AssistantMemory memory,
            @Value("${gemini.api.url}") String apiUrl, @Value("${gemini.api.key}") String apiKey) {
        this.mapper = mapper; this.catalog = catalog;this.memory=memory; this.apiUrl = apiUrl; this.apiKey = apiKey;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000); factory.setReadTimeout(30000);
        client = RestClient.builder().requestFactory(factory).build();
    }

    public record PlannedTurn(FinancialPlan plan,AssistantMemory.Update memoryUpdate) {}
    public FinancialPlan plan(String question,List<FinancialPlan.Turn> history,ZonedDateTime now) {
        return generate(question,history,now,null).plan();
    }
    public PlannedTurn planWithMemory(String question,List<FinancialPlan.Turn> history,ZonedDateTime now,AssistantMemory.Context context) {
        return generate(question,history,now,Objects.requireNonNull(context));
    }
    private PlannedTurn generate(String question, List<FinancialPlan.Turn> history, ZonedDateTime now,AssistantMemory.Context context) {
        long started = System.nanoTime();
        LocalDate today = now.toLocalDate();
        var rolling = new LinkedHashMap<String, Object>();
        for (int months : List.of(1, 3, 6, 12)) rolling.put(months + "", Map.of(
                "start", today.minusMonths(months).toString(), "endExclusive", today.plusDays(1).toString()));
        var days = new LinkedHashMap<String,Object>();
        for (int count : List.of(7,14,30)) days.put(Integer.toString(count), Map.of(
                "start", today.minusDays(count-1).toString(), "endExclusive", today.plusDays(1).toString()));
        var calendar = Map.of("today", today.toString(), "tomorrow", today.plusDays(1).toString(),
                "currentMonth", Map.of("start", today.withDayOfMonth(1).toString(), "endExclusive", today.withDayOfMonth(1).plusMonths(1).toString()),
                "previousMonth", Map.of("start", today.withDayOfMonth(1).minusMonths(1).toString(), "endExclusive", today.withDayOfMonth(1).toString()),
                "rollingMonths", rolling, "rollingDays", days);
        var inputValues=new LinkedHashMap<String,Object>();inputValues.put("currentDateTime",now.toString());inputValues.put("calendar",calendar);inputValues.put("messages",history);inputValues.put("question",question);
        if(context!=null)inputValues.put("conversationMemory",context.payload());
        String input=mapper.writeValueAsString(inputValues);
        String system = catalog.instructions() + "\nCATALOGO FINANCEIRO:\n" + catalog.json();
        if(context!=null)system += "\n"+memory.instructions();
        int bytes = system.getBytes(StandardCharsets.UTF_8).length + input.getBytes(StandardCharsets.UTF_8).length;
        if (maxOutputTokens < 1 || bytes > maxInputBytes) throw new AssistantPlanningException("Contexto financeiro excede o limite de planejamento.");
        var body = Map.of("systemInstruction", Map.of("parts", List.of(Map.of("text", system))),
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", input)))),
                "generationConfig", Map.of("candidateCount", 1, "temperature", 0,
                        "maxOutputTokens", maxOutputTokens,
                        "responseFormat", Map.of("text", Map.of("mimeType", "APPLICATION_JSON", "schema", context==null?schema():Map.of("type","object","properties",Map.of("plan",schema(),"memoryUpdate",memory.schema()),"required",List.of("plan","memoryUpdate"),"additionalProperties",false)))));
        log.info("event=assistant.gemini.send catalogVersion={} inputBytes={} historyTurns={}", catalog.version(), bytes, history.size());
        try {
            JsonNode response = client.post().uri(apiUrl).header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(JsonNode.class);
            if (response == null || !"STOP".equals(response.path("candidates").path(0).path("finishReason").asText()))
                throw new AssistantPlanningException("O Gemini não concluiu o planejamento.");
            StringBuilder text = new StringBuilder();
            for (JsonNode part : response.path("candidates").path(0).path("content").path("parts"))
                if (!part.path("thought").asBoolean(false)) text.append(part.path("text").asText(""));
            if (text.length() == 0 || text.length() > 24000) throw new AssistantPlanningException("Resposta de planejamento inválida.");
            FinancialPlan plan;AssistantMemory.Update update=null;
            if(context==null)plan=parse(text.toString());
            else {
                var root=mapper.readTree(text.toString());
                if(root==null || !root.isObject() || !new HashSet<>(root.propertyNames()).equals(Set.of("plan","memoryUpdate")))throw invalid();
                plan=parse(mapper.writeValueAsString(root.path("plan")));
                update=plan.decision()==FinancialPlan.Decision.unsupported?null:memory.approve(root.path("memoryUpdate"),context,question);
            }
            log.info("event=assistant.gemini.complete decision={} catalogVersion={} viewCount={} sqlExecuted=false durationMs={}",
                    plan.decision(), plan.catalogVersion(), plan.views().size(), SafeDiagnostics.elapsedMs(started));
            return new PlannedTurn(plan,update);
        } catch (RuntimeException failure) {
            SafeDiagnostics.failure(log, "assistant.gemini.failed", "AssistantGemini.plan", failure, SafeDiagnostics.elapsedMs(started), false);
            if (failure instanceof AssistantPlanningException known) throw known;
            throw new AssistantPlanningException("Não foi possível preparar a consulta com o Gemini.", failure);
        }
    }

    public FinancialPlan parse(String json) {
        try {
            JsonNode root = mapper.readTree(json);
            if (root == null || !root.isObject() || !new HashSet<>(root.propertyNames()).equals(KEYS)) throw invalid();
            var plan = mapper.readValue(json, FinancialPlan.class);
            if (!catalog.version().equals(plan.catalogVersion()) || plan.decision() == null || plan.interpretation() == null ||
                    plan.interpretation().isBlank() || plan.interpretation().length() > 1200 || plan.parameters() == null ||
                    plan.parameters().size() > 20 || plan.views() == null || plan.views().size() > 7 ||
                    !catalog.viewNames().containsAll(plan.views())) throw invalid();
            if (plan.decision() == FinancialPlan.Decision.query) {
                if (plan.sql() == null || plan.sql().isBlank() || plan.sql().length() > 16000 || plan.views().isEmpty() || plan.clarification() != null) throw invalid();
                Set<String> parameters = new HashSet<>();
                for (var p : plan.parameters()) {
                    if (p == null || p.name() == null || !p.name().matches("[a-z][a-z0-9_]{0,39}") ||
                            Set.of("user_id", "userid", "tenant_id").contains(p.name()) || !parameters.add(p.name()) ||
                            !TYPES.contains(p.type()) || p.value() == null || p.value().length() > 240) throw invalid();
                    switch (p.type()) {
                        case "date" -> LocalDate.parse(p.value());
                        case "timestamp" -> LocalDateTime.parse(p.value());
                        case "decimal" -> { if (new BigDecimal(p.value()).precision() > 20) throw invalid(); }
                        case "integer" -> Long.parseLong(p.value());
                        default -> { }
                    }
                }
                Set<String> referenced = new HashSet<>();
                var match = Pattern.compile("(?<!:):([a-z][a-z0-9_]*)").matcher(plan.sql());
                while (match.find()) referenced.add(match.group(1));
                if (!referenced.equals(parameters)) throw invalid();
            } else {
                if (plan.sql() != null || !plan.parameters().isEmpty() || !plan.views().isEmpty()) throw invalid();
                if (plan.decision() == FinancialPlan.Decision.clarify) {
                    if (plan.clarification() == null || plan.clarification().isBlank() || plan.clarification().length() > 800) throw invalid();
                } else if (plan.clarification() != null) throw invalid();
            }
            // Valida apenas a estrutura da proposta, nunca a segurança/semântica do SQL.
            return plan;
        } catch (RuntimeException failure) {
            if (failure instanceof AssistantPlanningException known) throw known;
            throw new AssistantPlanningException("O Gemini retornou um planejamento inválido.", failure);
        }
    }
    private AssistantPlanningException invalid() { return new AssistantPlanningException("O Gemini retornou um planejamento inválido."); }
    private Map<String, Object> schema() {
        var properties = new LinkedHashMap<String, Object>();
        properties.put("catalogVersion", Map.of("type", "string", "enum", List.of(catalog.version())));
        properties.put("decision", Map.of("type", "string", "enum", List.of("query", "clarify", "unsupported")));
        properties.put("interpretation", Map.of("type", "string", "maxLength", 1200));
        properties.put("sql", Map.of("type", List.of("string", "null")));
        properties.put("parameters", Map.of("type", "array", "maxItems", 20, "items", Map.of("type", "object",
                "properties", Map.of("name", Map.of("type", "string"), "type", Map.of("type", "string", "enum", TYPES), "value", Map.of("type", "string")),
                "required", List.of("name", "type", "value"), "additionalProperties", false)));
        properties.put("views", Map.of("type", "array", "maxItems", 7, "items", Map.of("type", "string", "enum", catalog.viewNames())));
        properties.put("clarification", Map.of("type", List.of("string", "null")));
        return Map.of("type", "object", "properties", properties, "required", List.copyOf(properties.keySet()), "additionalProperties", false);
    }
}
