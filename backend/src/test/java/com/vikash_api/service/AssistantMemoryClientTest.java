package com.vikash_api.service;
import com.vikash_api.assistant.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpRequest;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
class AssistantMemoryClientTest {
 @Test void sendsMemoryAsDataAndUpdatesItInTheSamePlanningRequest() throws Exception {
  var fixture=new AssistantGeminiClientTest();fixture.setup();var memory=new AssistantMemory(fixture.mapper);
  var state=new AssistantMemory.State(AssistantMemory.VERSION,UUID.randomUUID(),UUID.randomUUID(),10,20,Instant.parse("2026-10-16T12:00:00Z"),new AssistantMemory.View("Gastos nas contas Inter",Map.of("institution","Inter")));
  var context=new AssistantMemory.Context(state,List.of(),false);
  var response=Map.of("plan",fixture.proposal(),"memoryUpdate",Map.of("summary","Gastos Inter no mês anterior","changes",List.of(Map.of("field","period","value","setembro de 2026","evidence","mês passado"))));
  fixture.server.expect(requestTo("https://gemini.test/plan")).andExpect(request->{
   var body=fixture.mapper.readTree(((MockClientHttpRequest)request).getBodyAsString());
   var input=fixture.mapper.readTree(body.path("contents").path(0).path("parts").path(0).path("text").asText());
   assertThat(input.path("conversationMemory").path("filters").path("institution").asText()).isEqualTo("Inter");
   assertThat(input.toString()).doesNotContain(state.ownerUuid().toString(),state.conversationUuid().toString());
   assertThat(body.path("generationConfig").path("responseFormat").path("text").path("schema").path("properties").has("memoryUpdate")).isTrue();
  }).andRespond(withSuccess(fixture.response("STOP",fixture.mapper.writeValueAsString(response)),MediaType.APPLICATION_JSON));
  var planned=fixture.client.planWithMemory("E no mês passado?",List.of(),fixture.now,context);
  var updated=memory.apply(planned.memoryUpdate(),context,"E no mês passado?",21,Instant.now());
  assertThat(updated.view().filters()).containsEntry("institution","Inter").containsEntry("period","setembro de 2026");fixture.server.verify();
 }
}
