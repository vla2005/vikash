package com.vikash_api.service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;
import java.util.UUID;

import com.vikash_api.dtos.requests.AiAnalysisContext;
import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.enums.TransactionType;
import com.vikash_api.services.AiAnalysisService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class AiAnalysisServiceTest {
    private final JsonMapper mapper = JsonMapper.builder().build();
    private MockRestServiceServer server;
    private AiAnalysisService service;
    private final AiAnalysisContext context = new AiAnalysisContext(List.of(), List.of(), List.of(), List.of());

    @BeforeEach
    void setup() {
        var builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new AiAnalysisService(mapper, "https://gemini.test/generateContent", "fake-test-key");
        ReflectionTestUtils.setField(service, "restClient", builder.build());
    }

    @Test
    void sendsEnumNamesInContextAndSchemaAndExtractsAnalysis() {
        server.expect(requestTo("https://gemini.test/generateContent"))
                .andExpect(header("x-goog-api-key", "fake-test-key"))
                .andExpect(request -> {
                    var body = mapper.readTree(((MockClientHttpRequest) request).getBodyAsString());
                    assertThat(body.path("generationConfig").path("maxOutputTokens").asInt()).isEqualTo(2048);
                    assertThat(body.path("generationConfig").path("candidateCount").asInt()).isEqualTo(1);
                    assertThat(body.path("generationConfig").path("responseFormat").path("text").path("mimeType").asText()).isEqualTo("APPLICATION_JSON");
                    var input = mapper.readTree(body.path("contents").path(0).path("parts").path(0).path("text").asText());
                    var types = Arrays.stream(TransactionType.values()).map(Enum::name).toList();
                    var methods = Arrays.stream(PaymentMethod.values()).map(Enum::name).toList();
                    assertThat(input.path("transactionTypes")).isEqualTo(mapper.valueToTree(types));
                    assertThat(input.path("paymentMethods")).isEqualTo(mapper.valueToTree(methods));
                    assertThat(input.path("creditCards").isArray()).isTrue();
                    assertThat(input.path("transcription").asText()).isEqualTo("Paguei um boleto");
                    var schema = body.path("generationConfig").path("responseFormat").path("text").path("schema").path("properties");
                    assertThat(schema.path("type").path("anyOf").path(0).path("enum")).isEqualTo(mapper.valueToTree(types));
                    assertThat(schema.path("paymentMethod").path("anyOf").path(0).path("enum")).isEqualTo(mapper.valueToTree(methods));
                    assertThat(schema.has("creditCardUuid")).isTrue();
                    assertThat(schema.has("installmentCount")).isTrue();
                })
                .andRespond(withSuccess(geminiResponse("STOP", "{\"paymentMethod\":\"BANK_SLIP\"}"), MediaType.APPLICATION_JSON));

        assertThat(service.analyze(" Paguei um boleto ", context).paymentMethod()).isEqualTo(PaymentMethod.BANK_SLIP);
        server.verify();
    }

    @Test
    void rejectsOversizedUtf8ContextBeforeSendingRequest() {
        ReflectionTestUtils.setField(service, "maxInputBytes", 1000);
        assertThatThrownBy(() -> service.analyze("é".repeat(600), context))
                .isInstanceOf(com.vikash_api.exceptions.InvalidTransactionException.class);
        server.verify();
    }

    @Test
    void parsesInstallmentCountAndSendsInstructionsToUsePurchaseTotal() {
        server.expect(anything()).andExpect(request -> {
            var body = mapper.readTree(((MockClientHttpRequest) request).getBodyAsString());
            var instructions = body.path("systemInstruction").path("parts").path(0).path("text").asText();
            assertThat(instructions).contains("installmentCount 3", "valor total da compra");
            assertThat(instructions).doesNotContain("ainda não são suportadas");
        }).andRespond(withSuccess(geminiResponse("STOP", "{\"amount\":1500,\"installmentCount\":3}"), MediaType.APPLICATION_JSON));
        var analysis = service.analyze("Comprei por 1500 em 3x", context);
        assertThat(analysis.installmentCount()).isEqualTo(3);
        assertThat(analysis.amount()).isEqualByComparingTo("1500");
    }

    @Test
    void rejectsFractionalInstallmentCountRatherThanRoundingItSilently() {
        server.expect(anything()).andRespond(withSuccess(geminiResponse("STOP", "{\"amount\":1500,\"installmentCount\":3.5}"), MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> service.analyze("Compra parcelada", context)).hasMessage("O Gemini retornou uma análise inválida.");
    }

    @Test
    void rejectsIncompleteResponse() {
        server.expect(anything()).andRespond(withSuccess(geminiResponse("MAX_TOKENS", "{}"), MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> service.analyze("Almoço", context)).isInstanceOf(IllegalStateException.class).hasMessage("O Gemini não concluiu a análise.");
    }

    @Test
    void convertsAnalysisToJavaTypesWithoutLosingDecimalPrecision() {
        String json = """
                {"description":"Almoço","amount":45.10,"type":"EXPENSE",
                 "paymentMethod":"PIX","occurredAt":"2026-10-03T12:30:00",
                 "accountUuid":"b6dd0fd1-a50c-4cd6-b617-b44b4b18e459",
                 "destinationAccountUuid":null,"defaultCategoryName":"Alimentação",
                 "customCategoryUuid":null,"missingFields":[]}
                """;
        server.expect(anything()).andRespond(withSuccess(geminiResponse("STOP", json), MediaType.APPLICATION_JSON));
        var analysis = service.analyze("Almoço de 45,10", context);
        assertThat(analysis.amount().toPlainString()).isEqualTo("45.10");
        assertThat(analysis.type()).isEqualTo(TransactionType.EXPENSE);
        assertThat(analysis.paymentMethod()).isEqualTo(PaymentMethod.PIX);
        assertThat(analysis.occurredAt()).isEqualTo(LocalDateTime.of(2026, 10, 3, 12, 30));
        assertThat(analysis.accountUuid()).isEqualTo(UUID.fromString("b6dd0fd1-a50c-4cd6-b617-b44b4b18e459"));
        assertThat(analysis.destinationAccountUuid()).isNull();
        assertThat(analysis.customCategoryUuid()).isNull();
        assertThat(analysis.missingFields()).isEmpty();
        server.verify();
    }

    @Test
    void preservesNullFieldsWhenInformationIsMissing() {
        server.expect(anything()).andRespond(withSuccess(geminiResponse("STOP", "{\"accountUuid\":null,\"amount\":null,\"missingFields\":[\"accountUuid\",\"amount\"]}"), MediaType.APPLICATION_JSON));
        var analysis = service.analyze("Fiz um Pix", context);
        assertThat(analysis.accountUuid()).isNull();
        assertThat(analysis.amount()).isNull();
        assertThat(analysis.missingFields()).containsExactly("accountUuid", "amount");
    }

    @Test
    void rejectsInvalidEnumOrUuid() {
        server.expect(anything()).andRespond(withSuccess(geminiResponse("STOP", "{\"type\":\"INVALID\"}"), MediaType.APPLICATION_JSON));
        server.expect(anything()).andRespond(withSuccess(geminiResponse("STOP", "{\"accountUuid\":\"not-a-uuid\"}"), MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> service.analyze("Almoço", context)).hasMessage("O Gemini retornou uma análise inválida.");
        assertThatThrownBy(() -> service.analyze("Almoço", context)).hasMessage("O Gemini retornou uma análise inválida.");
        server.verify();
    }

    @Test
    void rejectsInvalidJsonAndHandlesProviderFailure() {
        server.expect(anything()).andRespond(withSuccess(geminiResponse("STOP", "texto inválido"), MediaType.APPLICATION_JSON));
        server.expect(anything()).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
        assertThatThrownBy(() -> service.analyze("Almoço", context)).hasMessage("O Gemini retornou uma análise inválida.");
        assertThatThrownBy(() -> service.analyze("Almoço", context)).hasMessage("Não foi possível consultar o Gemini.");
        server.verify();
    }

    private String geminiResponse(String finishReason, String text) {
        return mapper.writeValueAsString(Map.of("candidates", List.of(Map.of(
                "finishReason", finishReason,
                "content", Map.of("parts", List.of(
                        Map.of("thought", true, "text", "Não incluir no JSON"),
                        Map.of("text", text)))))));
    }

    @Test
    void sendsRealInvoicesAndParsesVoicePaymentWithSpokenTime() {
        var invoiceUuid = UUID.randomUUID();
        var cardUuid = UUID.randomUUID();
        var accountUuid = UUID.randomUUID();
        var invoice = new com.vikash_api.dtos.responses.CreditCardInvoiceAnalysisContext(invoiceUuid,
                cardUuid, "2026-11", java.time.LocalDate.of(2026, 11, 3), java.time.LocalDate.of(2026, 11, 10),
                com.vikash_api.enums.CreditCardInvoiceStatus.OPEN);
        var paymentContext = new AiAnalysisContext(List.of(), List.of(), List.of(), List.of(), List.of(invoice));
        var json = """
                {"description":null,"amount":null,"type":"INVOICE_PAYMENT","paymentMethod":"OTHER",
                 "occurredAt":"2026-11-04T19:00:00","accountUuid":"%s","creditCardUuid":"%s",
                 "creditCardInvoiceUuid":"%s","destinationAccountUuid":null,"defaultCategoryName":null,
                 "customCategoryUuid":null,"installmentCount":1,"missingFields":[]}
                """.formatted(accountUuid, cardUuid, invoiceUuid);
        server.expect(anything()).andExpect(request -> {
            var body = mapper.readTree(((MockClientHttpRequest) request).getBodyAsString());
            var input = mapper.readTree(body.path("contents").path(0).path("parts").path(0).path("text").asText());
            assertThat(input.path("creditCardInvoices").path(0).path("uuid").asText()).isEqualTo(invoiceUuid.toString());
            var prompt = body.path("systemInstruction").path("parts").path(0).path("text").asText();
            assertThat(prompt).contains("INVOICE_PAYMENT", "ontem às 19:00:00", "anos diferentes", "paymentMethod OTHER");
        }).andRespond(withSuccess(geminiResponse("STOP", json), MediaType.APPLICATION_JSON));
        var analysis = service.analyze("Paguei a fatura de novembro do Bradesco com minha conta Itaú ontem às 19h", paymentContext);
        assertThat(analysis.creditCardInvoiceUuid()).isEqualTo(invoiceUuid);
        assertThat(analysis.accountUuid()).isEqualTo(accountUuid);
        assertThat(analysis.occurredAt()).isEqualTo(LocalDateTime.of(2026, 11, 4, 19, 0));
        assertThat(analysis.type()).isEqualTo(TransactionType.INVOICE_PAYMENT);
        assertThat(analysis.amount()).isNull();
        server.verify();
    }
}
