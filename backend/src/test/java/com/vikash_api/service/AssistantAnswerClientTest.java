package com.vikash_api.service;
import com.vikash_api.assistant.*;
import com.vikash_api.exceptions.AssistantAnswerException;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
class AssistantAnswerClientTest {
    final AssistantAnswerFormatterTest fixture=new AssistantAnswerFormatterTest();
    AssistantAnswerClient client;MockRestServiceServer server;
    @BeforeEach void setup() throws Exception {
        client=new AssistantAnswerClient(fixture.mapper,fixture.formatter,"https://gemini.test/answer","fake-key");
        var builder=RestClient.builder();server=MockRestServiceServer.bindTo(builder).build();
        ReflectionTestUtils.setField(client,"client",builder.build());ReflectionTestUtils.setField(client,"enabled",true);
    }
    String response(String finish,String text) { return fixture.mapper.writeValueAsString(Map.of("candidates",List.of(Map.of("finishReason",finish,"content",Map.of("parts",List.of(Map.of("text",text))))))); }
    @Test void sendsOnlyBoundedFactsAndOfficialContextWithNoSqlIdentityOrTools() {
        var input=fixture.input();
        server.expect(requestTo("https://gemini.test/answer")).andExpect(header("x-goog-api-key","fake-key")).andExpect(request->{
            var body=fixture.mapper.readTree(((MockClientHttpRequest)request).getBodyAsString());
            var payload=body.path("contents").path(0).path("parts").path(0).path("text").asText();
            assertThat(payload).contains("facts","total","R$ ").doesNotContain(input.ownerUuid().toString(),input.questionId().toString(),"SELECT amount FROM assistant_finance.transactions WHERE occurred_at>=CAST(:inicio AS timestamp)","account_uuid","estimatedCost","durationMs");
            assertThat(body.has("tools")).isFalse();
            assertThat(body.path("generationConfig").path("maxOutputTokens").asInt()).isEqualTo(2048);
        }).andRespond(withSuccess(response("STOP","{\"template\":\"Total: {{r0c0:money}}.\"}"),MediaType.APPLICATION_JSON));
        assertThat(client.answer(input).content()).contains("1.234.567.890.123.456,78");server.verify();
    }
    @Test void disabledAndOversizedContextMakeNoNetworkRequest() {
        ReflectionTestUtils.setField(client,"enabled",false);
        assertThatThrownBy(()->client.answer(fixture.input())).isInstanceOf(AssistantAnswerException.class);
        ReflectionTestUtils.setField(client,"enabled",true);ReflectionTestUtils.setField(client,"maxInputBytes",1000);
        assertThatThrownBy(()->client.answer(fixture.input())).isInstanceOfSatisfying(AssistantAnswerException.class,e->assertThat(e.getReason()).isEqualTo("CONTEXT_LIMIT"));server.verify();
    }
    @Test void providerFailureTruncationAndInventedAmountsNeverBecomeAnswers() {
        server.expect(anything()).andRespond(withServerError());
        assertThatThrownBy(()->client.answer(fixture.input())).isInstanceOfSatisfying(AssistantAnswerException.class,e->assertThat(e.getReason()).isEqualTo("UNAVAILABLE"));
        server.reset();server.expect(anything()).andRespond(withSuccess(response("MAX_TOKENS","{}"),MediaType.APPLICATION_JSON));
        assertThatThrownBy(()->client.answer(fixture.input())).isInstanceOf(AssistantAnswerException.class);
        server.reset();server.expect(anything()).andRespond(withSuccess(response("STOP","{\"template\":\"Total: R$ 500,00\"}"),MediaType.APPLICATION_JSON));
        assertThatThrownBy(()->client.answer(fixture.input())).isInstanceOf(AssistantAnswerException.class);
    }
}
