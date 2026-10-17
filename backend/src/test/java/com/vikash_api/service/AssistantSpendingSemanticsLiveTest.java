package com.vikash_api.service;

import com.vikash_api.assistant.*;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.repositories.UserRepository;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Opt-in: dados fictícios em banco descartável, com ritmo abaixo de quinze chamadas/minuto. */
@EnabledIfEnvironmentVariable(named="VIKASH_ASSISTANT_SPENDING_LIVE_TEST",matches="true")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
 "spring.datasource.url=${ASSISTANT_TEST_DB_URL}","spring.datasource.username=assistant_test","spring.datasource.password=${ASSISTANT_TEST_DB_PASSWORD}",
 "spring.datasource.driver-class-name=org.postgresql.Driver","spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect","spring.jpa.hibernate.ddl-auto=create-drop",
 "assistant.planning.enabled=true","assistant.execution.enabled=true","assistant.answer.enabled=true","assistant.memory.enabled=true",
 "assistant.execution.jdbc-url=${ASSISTANT_TEST_DB_URL}","assistant.execution.password=${ASSISTANT_READER_TEST_PASSWORD}","assistant.execution.pool-size=1",
 "security.ai.per-minute=100","security.ai.per-day=100","security.ai.global-per-day=1000",
 "gemini.api.key=${ASSISTANT_LIVE_GEMINI_API_KEY}","gemini.api.url=https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"})
class AssistantSpendingSemanticsLiveTest {
 @LocalServerPort int port;
 @Autowired JdbcTemplate jdbc; @Autowired UserRepository users; @Autowired ObjectMapper mapper;
 @Autowired AssistantMemory memory; @Autowired AssistantGeminiClient planner;
 @MockitoSpyBean AssistantQueryExecutor executor; @MockitoSpyBean AssistantAnswerClient writer;
 AuthResponse auth; RestClient client; long owner; String conversation="spending-"+UUID.randomUUID();
 final List<Map<String,Object>> report=new ArrayList<>();

 @BeforeAll void setup() throws Exception {
  var fixture=new AssistantAnswerPostgresFixture(jdbc);fixture.provision();
  var http=new SimpleClientHttpRequestFactory();http.setConnectTimeout(5000);http.setReadTimeout(100000);
  client=RestClient.builder().baseUrl("http://localhost:"+port).requestFactory(http).build();
  auth=client.post().uri("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
   .body(Map.of("name","Fictício","email",UUID.randomUUID()+"@spending.test","password","Password123!"))
   .retrieve().body(AuthResponse.class);
  owner=users.findByEmail(auth.getUser().getEmail()).orElseThrow().getId();
  long account=fixture.account(owner,"1703.80"),category=fixture.category(owner,"Mercado");
  fixture.expense(owner,account,category,"Despesa atual","200",0,"EXPENSE");
  fixture.expense(owner,account,category,"Quitação de fatura","300",0,"INVOICE_PAYMENT");
  fixture.expense(owner,account,category,"Transferência própria","700",0,"TRANSFER");
  fixture.expense(owner,account,category,"Receita","900",0,"INCOME");
  fixture.expense(owner,account,category,"Despesa anterior","333",-1,"EXPENSE");
  jdbc.update("UPDATE transactions SET occurred_at=CURRENT_DATE+interval '10 hours' WHERE user_id=? AND occurred_at>=date_trunc('month',CURRENT_TIMESTAMP)",owner);
 }
 JsonNode ask(String id,String question,String status,String... expected) throws Exception {
  // Cada turno faz no máximo duas chamadas; sem paralelismo ou retries automáticos.
  Thread.sleep(10000);
  clearInvocations(executor,writer);
  var input=Map.of("clientConversationId",conversation,"clientMessageId",id,"content",question);
  var response=client.post().uri("/api/assistant/messages").contentType(MediaType.APPLICATION_JSON)
   .header("Authorization","Bearer "+auth.getAccessToken()).header("Idempotency-Key",id)
   .body(input).retrieve().onStatus(HttpStatusCode::isError,(q,r)->{}).toEntity(JsonNode.class);
  var entry=new LinkedHashMap<String,Object>();entry.put("case",id);entry.put("question",question);
  entry.put("http",response.getStatusCode().value());report.add(entry);
  assertThat(response.getStatusCode().value()).as(id+" "+response.getBody().path("code").asText()).isIn(200,201);
  var body=response.getBody();String answer=body.path("reply").path("content").asText();entry.put("answer",answer);
  assertThat(body.path("status").asText()).as(id).isEqualTo(status);
  for(String part:expected)assertThat(answer).as(id).containsIgnoringCase(part);
  var stored=jdbc.queryForMap("SELECT proposal_json,query_result_json FROM assistant_messages WHERE uuid=?",UUID.fromString(body.path("message").path("id").asText()));
  var plan=mapper.readTree(stored.get("proposal_json").toString());entry.put("plan",plan);
  if(status.equals("clarification")) {
   assertThat(plan.path("sql").isNull()).isTrue();assertThat(stored.get("query_result_json")).isNull();
   verify(executor,never()).execute(any(),any());verify(writer,never()).answer(any());
  } else {
   verify(executor,times(1)).execute(any(),any());verify(writer,times(1)).answer(any());
   assertThat(answer).doesNotContainIgnoringCase("dados duplicados","registros duplicados");
   entry.put("result",mapper.readTree(stored.get("query_result_json").toString()));
  }
  entry.put("memory",state().view());entry.put("passed",true);return body;
 }
 AssistantMemory.State state() {
  var row=jdbc.queryForMap("SELECT uuid,memory_json,memory_hash FROM assistant_conversations WHERE user_id=? AND client_id=?",owner,conversation);
  return memory.restore((String)row.get("memory_json"),(String)row.get("memory_hash"),UUID.fromString(auth.getUser().getUuid().toString()),(UUID)row.get("uuid"),Long.MAX_VALUE).orElseThrow();
 }
 void moveChoiceOutsideRecentWindow() {
  long id=jdbc.queryForObject("SELECT id FROM assistant_conversations WHERE user_id=? AND client_id=?",Long.class,owner,conversation);
  for(int i=0;i<8;i++) {
   UUID question=UUID.randomUUID(),reply=UUID.randomUUID();
   jdbc.update("INSERT INTO assistant_messages(uuid,conversation_id,client_id,role,content,status,created_at,reply_uuid) VALUES (?,?,?,'user','Mantenha os mesmos critérios.','answered',CURRENT_TIMESTAMP,?)",question,id,"neutral-"+question,reply);
   jdbc.update("INSERT INTO assistant_messages(uuid,conversation_id,client_id,role,content,status,created_at) VALUES (?,?,?,'assistant','Seguimos com os critérios escolhidos.','sent',CURRENT_TIMESTAMP)",reply,id,"reply-"+question);
  }
 }
 @Test void realGeminiClarifiesUsesChoicePreservesItAndChangesMetric() throws Exception {
  ask("ambiguous_accounts","Quanto gastei nas minhas contas neste mês?","clarification","consumo","caixa","fatura");
  ask("first_option","A primeira opção.","answered","200,00","consumo","fatura");
  assertThat(state().view().filters().get("metric")).containsIgnoringCase("consumo");
  moveChoiceOutsideRecentWindow();
  ask("memory_follow_up","E no mês passado?","answered","333,00","consumo","fatura");
  ask("switch_to_cash","Agora quero a saída de caixa das minhas contas neste mês, incluindo as faturas pagas.","answered","500,00","caixa","fatura");
  assertThat(state().view().filters().get("metric")).containsIgnoringCase("caixa");
  conversation="spending-new-"+UUID.randomUUID();
  ask("ambiguous_two_weeks","Quanto gastei nas minhas contas nas últimas duas semanas?","clarification","consumo","caixa","fatura");
  ask("second_option","A segunda opção.","answered","500,00","caixa","fatura");
  ask("explicit_exclusion","Agora quero meu consumo das contas neste mês, sem pagamentos de fatura.","answered","200,00","consumo","fatura");
 }
 @Test void oldAssistantAssumptionDoesNotBecomeUserChoice() throws Exception {
  Thread.sleep(10000);
  var base=memory.empty(UUID.randomUUID(),UUID.randomUUID());
  var state=new AssistantMemory.State(base.version(),base.ownerUuid(),base.conversationUuid(),1,1,Instant.now(),
   new AssistantMemory.View("Usuário perguntou sobre gastos nas contas; o assistente assumiu consumo sem pedir escolha.",Map.of("scope","contas","metric","gastos")));
  var turn=planner.planWithMemory("E meus gastos neste mês?",List.of(new FinancialPlan.Turn("assistant","Considerei consumo e excluí faturas.")),
   ZonedDateTime.now(ZoneId.of("America/Sao_Paulo")),new AssistantMemory.Context(state,List.of(),false));
  var entry=new LinkedHashMap<String,Object>();entry.put("case","old_assistant_assumption");entry.put("plan",turn.plan());report.add(entry);
  assertThat(turn.plan().decision()).isEqualTo(FinancialPlan.Decision.clarify);
  assertThat(turn.plan().sql()).isNull();assertThat(turn.plan().clarification()).containsIgnoringCase("consumo").containsIgnoringCase("caixa");
  entry.put("passed",true);
 }
 @AfterAll void saveReport() throws Exception {
  String file=System.getProperty("assistant.spending.report");
  if(file!=null)Files.writeString(Path.of(file),mapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of("syntheticOnly",true,"model","gemini-3.5-flash-lite","cases",report)));
 }
}
