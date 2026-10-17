package com.vikash_api.service;

import com.vikash_api.assistant.*;
import com.vikash_api.exceptions.AssistantPlanningException;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class AssistantGeminiClientTest {
    final JsonMapper mapper = JsonMapper.builder().build();
    FinancialCatalog catalog; AssistantGeminiClient client; MockRestServiceServer server;
    final ZonedDateTime now = ZonedDateTime.parse("2026-10-16T12:00:00-03:00[America/Sao_Paulo]");
    @BeforeEach void setup() throws Exception {
        catalog = new FinancialCatalog(mapper);
        client = new AssistantGeminiClient(mapper, catalog, "https://gemini.test/plan", "fake-key");
        var builder = RestClient.builder(); server = MockRestServiceServer.bindTo(builder).build();
        ReflectionTestUtils.setField(client, "client", builder.build());
    }
    Map<String,Object> proposal() {
        var root = new LinkedHashMap<String,Object>();
        root.put("catalogVersion", catalog.version()); root.put("decision", "query"); root.put("interpretation", "Contas neste mês");
        root.put("sql", "SELECT SUM(amount) FROM assistant_finance.transactions WHERE occurred_at >= CAST(:inicio AS timestamp)");
        root.put("parameters", List.of(Map.of("name", "inicio", "type", "date", "value", "2026-10-01")));
        root.put("views", List.of("assistant_finance.transactions")); root.put("clarification", null); return root;
    }
    String response(String finish, String text) {
        return mapper.writeValueAsString(Map.of("candidates", List.of(Map.of("finishReason", finish,
            "content", Map.of("parts", List.of(Map.of("text", text)))))));
    }
    @Test void sendsTrustedCatalogDateSchemaAndOwnedContextWithoutAnyFinancialRecords() {
        server.expect(requestTo("https://gemini.test/plan")).andExpect(header("x-goog-api-key", "fake-key"))
            .andExpect(request -> {
                var body = mapper.readTree(((MockClientHttpRequest)request).getBodyAsString());
                assertThat(body.path("systemInstruction").toString()).contains(catalog.version(), "INVOICE_PAYMENT", "assistant_finance.transactions");
                var input = mapper.readTree(body.path("contents").path(0).path("parts").path(0).path("text").asText());
                assertThat(input.path("currentDateTime").asText()).isEqualTo(now.toString());
                assertThat(input.path("messages").size()).isEqualTo(1);
                assertThat(input.path("calendar").path("rollingMonths").path("3").path("start").asText()).isEqualTo("2026-07-16");
                assertThat(input.path("calendar").path("rollingMonths").path("3").path("endExclusive").asText()).isEqualTo("2026-10-17");
                assertThat(input.path("calendar").path("previousMonth").path("start").asText()).isEqualTo("2026-09-01");
                assertThat(input.path("calendar").path("rollingDays").path("14").path("start").asText()).isEqualTo("2026-10-03");
                assertThat(input.path("calendar").path("rollingDays").path("14").path("endExclusive").asText()).isEqualTo("2026-10-17");
                assertThat(input.path("question").asText()).isEqualTo("E este mês?");
                assertThat(body.path("generationConfig").path("responseFormat").path("text").path("schema").path("additionalProperties").asBoolean()).isFalse();
            }).andRespond(withSuccess(response("STOP", mapper.writeValueAsString(proposal())), MediaType.APPLICATION_JSON));
        assertThat(client.plan("E este mês?", List.of(new FinancialPlan.Turn("user", "Gastos nas contas")), now).decision()).isEqualTo(FinancialPlan.Decision.query);
        server.verify();
    }
    @Test void rejectsTruncationAndProviderFailures() {
        server.expect(anything()).andRespond(withSuccess(response("MAX_TOKENS", "{}"), MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.plan("Fictícia", List.of(), now)).isInstanceOf(AssistantPlanningException.class);
        server.reset();
        server.expect(anything()).andRespond(withServerError());
        assertThatThrownBy(() -> client.plan("Fictícia", List.of(), now)).isInstanceOf(AssistantPlanningException.class);
    }
    @Test void rejectsOversizedContextBeforeNetwork() {
        ReflectionTestUtils.setField(client, "maxInputBytes", 100);
        assertThatThrownBy(() -> client.plan("é".repeat(100), List.of(), now)).isInstanceOf(AssistantPlanningException.class);
        server.verify();
    }
    @Test void refusesUnknownCatalogViewAndUnexpectedRootFields() {
        for (String field : List.of("catalogVersion", "views", "extra")) {
            var p = proposal(); p.put(field, field.equals("views") ? List.of("public.users") : "unknown");
            assertThatThrownBy(() -> client.parse(mapper.writeValueAsString(p))).isInstanceOf(AssistantPlanningException.class);
        }
    }
    @Test void refusesMissingMismatchedInvalidOrReservedParameters() {
        for (Object params : List.of(List.of(), List.of(Map.of("name","inicio","type","date","value","2026-02-30")),
            List.of(Map.of("name","user_id","type","integer","value","1")),
            List.of(Map.of("name","inicio","type","text","value","x"),Map.of("name","inicio","type","text","value","x")))) {
            var p = proposal(); p.put("parameters", params);
            assertThatThrownBy(() -> client.parse(mapper.writeValueAsString(p))).isInstanceOf(AssistantPlanningException.class);
        }
    }
    @Test void clarificationCannotCarrySqlAndRequiresQuestion() {
        var p = proposal(); p.put("decision", "clarify"); p.put("clarification", "Contas ou cartões?");
        assertThatThrownBy(() -> client.parse(mapper.writeValueAsString(p))).isInstanceOf(AssistantPlanningException.class);
        p.put("sql", null); p.put("parameters", List.of()); p.put("views", List.of());
        assertThat(client.parse(mapper.writeValueAsString(p)).clarification()).isEqualTo("Contas ou cartões?");
        p.put("clarification", " ");
        assertThatThrownBy(() -> client.parse(mapper.writeValueAsString(p))).isInstanceOf(AssistantPlanningException.class);
    }
    @Test void unsupportedNeverIncludesSqlOrUnboundedReply() {
        var p = proposal(); p.put("decision", "unsupported"); p.put("sql", null); p.put("parameters", List.of()); p.put("views", List.of());
        assertThat(client.parse(mapper.writeValueAsString(p)).decision()).isEqualTo(FinancialPlan.Decision.unsupported);
        p.put("clarification", "Resposta arbitrária");
        assertThatThrownBy(() -> client.parse(mapper.writeValueAsString(p))).isInstanceOf(AssistantPlanningException.class);
    }
}
