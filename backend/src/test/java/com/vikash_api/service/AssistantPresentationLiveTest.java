package com.vikash_api.service;
import com.vikash_api.assistant.*;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.repositories.UserRepository;
import java.nio.file.*;
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
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

@EnabledIfEnvironmentVariable(named="VIKASH_ASSISTANT_PRESENTATION_LIVE_TEST",matches="true")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
 "spring.datasource.url=${ASSISTANT_TEST_DB_URL}","spring.datasource.username=assistant_test","spring.datasource.password=${ASSISTANT_TEST_DB_PASSWORD}",
 "spring.datasource.driver-class-name=org.postgresql.Driver","spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect","spring.jpa.hibernate.ddl-auto=create-drop",
 "assistant.planning.enabled=true","assistant.execution.enabled=true","assistant.answer.enabled=true","assistant.execution.jdbc-url=${ASSISTANT_TEST_DB_URL}",
 "assistant.execution.password=${ASSISTANT_READER_TEST_PASSWORD}","assistant.execution.pool-size=1","security.ai.per-minute=100","security.ai.per-day=100","security.ai.global-per-day=1000",
 "gemini.api.key=${ASSISTANT_LIVE_GEMINI_API_KEY}","gemini.api.url=https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"})
class AssistantPresentationLiveTest extends com.vikash_api.support.VerifiedUserFixture {
 @LocalServerPort int port;@Autowired JdbcTemplate jdbc;@Autowired UserRepository users;@Autowired ObjectMapper mapper;
 @MockitoSpyBean AssistantGeminiClient planner;@MockitoSpyBean AssistantAnswerClient writer;
 RestClient client;AuthResponse user,other;long lastCall;int calls;final List<Map<String,Object>> report=new ArrayList<>();
 // Uma trava para CADA chamada de provedor, não para cada pergunta: <=9 chamadas/minuto.
 synchronized void pace() throws InterruptedException {long wait=7000-(System.nanoTime()-lastCall)/1000000;if(wait>0)Thread.sleep(wait);lastCall=System.nanoTime();calls++;}
 @BeforeAll void setup() throws Exception {
  new AssistantAnswerPostgresFixture(jdbc).provision();
  var http=new SimpleClientHttpRequestFactory();http.setConnectTimeout(5000);http.setReadTimeout(100000);client=RestClient.builder().baseUrl("http://localhost:"+port).requestFactory(http).build();
  user=register();other=register();var fixture=new AssistantAnswerPostgresFixture(jdbc);
  long id=users.findByEmail(user.getUser().getEmail()).orElseThrow().getId(),account=fixture.account(id,"1703.80"),market=fixture.category(id,"Mercado"),transport=fixture.category(id,"Transporte");
  fixture.expense(id,account,market,"Despesa fictícia","150",0,"EXPENSE");fixture.expense(id,account,transport,"Viagem fictícia","50.25",0,"EXPENSE");fixture.expense(id,account,market,"Mês passado fictício","333",-1,"EXPENSE");fixture.expense(id,account,market,"Não é consumo","300",0,"INVOICE_PAYMENT");
  long foreign=users.findByEmail(other.getUser().getEmail()).orElseThrow().getId(),fa=fixture.account(foreign,"9999.99"),fc=fixture.category(foreign,"Outra pessoa");fixture.expense(foreign,fa,fc,"Despesa alheia fictícia","8888.88",0,"EXPENSE");
  doAnswer(call->{pace();var plan=call.callRealMethod();report.add(Map.of("case","synthetic_plan","plan",plan));return plan;}).when(planner).plan(anyString(),anyList(),any());
  doAnswer(call->{pace();return call.callRealMethod();}).when(writer).answer(any());
 }
 AuthResponse register(){return createTestUser(Map.of("name","Teste visual fictício","email",UUID.randomUUID()+"@presentation-live.test","password","Password123!"));}
 ResponseEntity<JsonNode> send(AuthResponse auth,Map<String,Object> payload){return client.post().uri("/api/assistant/messages").contentType(MediaType.APPLICATION_JSON).header("Authorization","Bearer "+auth.getAccessToken()).header("Idempotency-Key",payload.get("clientMessageId").toString()).body(payload).retrieve().onStatus(HttpStatusCode::isError,(q,r)->{}).toEntity(JsonNode.class);}
 JsonNode ask(String name,String text,String expected) throws Exception {
  var payload=Map.<String,Object>of("clientConversationId","visual-"+UUID.randomUUID(),"clientMessageId",name,"content",text);
  var response=send(user,payload);int attempts=1;
  if(response.getStatusCode().value()==503){attempts++;response=send(user,payload);}
  var entry=new LinkedHashMap<String,Object>();entry.put("case",name);entry.put("http",response.getStatusCode().value());entry.put("attempts",attempts);report.add(entry);
  assertThat(response.getStatusCode().value()).as(name+" "+response.getBody().path("code").asText()).isIn(200,201);
  var body=response.getBody();var presentation=body.path("reply").path("presentation");
  assertThat(body.path("status").asText()).isEqualTo("answered");assertThat(presentation.path("version").asText()).isEqualTo(FinancialReplyPresentation.VERSION);
  boolean found=false;for(var block:presentation.path("blocks"))if(block.path("type").asText().equals(expected))found=true;
  assertThat(found).as(name+" type "+expected).isTrue();
  assertThat(body.toString()).doesNotContain("8888","8.888","9999","9.999","SELECT","assistant_finance","{{");
  int before=calls;assertThat(send(user,payload).getBody()).isEqualTo(body);assertThat(calls).isEqualTo(before);
  var foreign=new HashMap<>(payload);foreign.put("conversationId",body.path("conversationId").asText());assertThat(send(other,foreign).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);assertThat(calls).isEqualTo(before);
  entry.put("reply",body.path("reply"));entry.put("passed",true);return body;
 }
 @Test void realGeminiReturnsGroundedPieBarsAndMetricWithDurableReplay() throws Exception {
  var pie=ask("categories","Mostre meus gastos de consumo das contas neste mês por categoria, com gráfico de pizza e o valor de cada categoria. Exclua pagamentos de fatura e transferências.","pie");
  assertThat(pie.path("reply").path("presentation").toString()).contains("Mercado","Transporte","150","50.25");
  var bar=ask("months","Compare o total das despesas de consumo nas minhas contas deste mês e do mês anterior usando gráfico de barras. Retorne uma linha por mês, com o mês e o total. Exclua pagamento de fatura e transferências.","bar");
  assertThat(bar.path("reply").path("presentation").toString()).contains("200.25","333");
  var metric=ask("balance","Qual é o saldo atual somado de todas as minhas contas?","metric");
  assertThat(metric.path("reply").path("presentation").toString()).contains("1.703,80");
 }
 @Test void realGeminiChoosesDebtChartsBasedOnTheQuestion() throws Exception {
  long id=users.findByEmail(user.getUser().getEmail()).orElseThrow().getId();
  long foreign=users.findByEmail(other.getUser().getEmail()).orElseThrow().getId();
  UUID debt=UUID.randomUUID();
  jdbc.update("""
   INSERT INTO debts(uuid,user_id,creditor,total_amount,installment_count,initially_paid_installments,paid_installments,initial_next_due_date,version)
   VALUES (?,?,'Loja fictícia',1950.02,5,1,3,DATE '2026-02-21',0),
          (?,?,'Credor de outra conta',9999,1,0,0,DATE '2026-02-21',0)
   """,debt,id,UUID.randomUUID(),foreign);
  jdbc.update("""
   INSERT INTO transactions(uuid,user_id,account_id,debt_id,debt_installment_number,description,amount,type,payment_method,
                            occurred_at,transcription,created_at,updated_at)
   SELECT p.uuid,d.user_id,a.id,d.id,p.number,'Pagamento fictício',p.amount,'EXPENSE','OTHER',p.paid_at,'',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
   FROM debts d JOIN accounts a ON a.user_id=d.user_id CROSS JOIN (VALUES
     (?::uuid,2,390.01,TIMESTAMP '2026-02-21 12:00'),(?::uuid,3,390,TIMESTAMP '2026-04-01 12:00')
   ) AS p(uuid,number,amount,paid_at) WHERE d.uuid=?
   """,UUID.randomUUID(),UUID.randomUUID(),debt);
  var reply=ask("debt-months","Quanto eu tenho que pagar de dívidas por mês?","bar").path("reply");
  var bar=reply.path("presentation").path("blocks").valueStream().filter(block->block.path("type").asText().equals("bar")).findFirst().orElseThrow();
  assertThat(bar.path("items").size()).isEqualTo(2);
  assertThat(bar.path("items").path(0).path("formattedValue").asText()).isEqualTo("R$ 390,00");
  assertThat(bar.path("items").path(1).path("formattedValue").asText()).isEqualTo("R$ 390,00");
  var pie=ask("debt-split","Como minhas dívidas se dividem entre o que já paguei e o que ainda está em aberto?","pie");
  assertThat(pie.path("reply").path("presentation").toString()).contains("R$ 1.170,02","R$ 780,00");
  var timeline=ask("debt-payments","Como evoluiu o valor que eu paguei em dívidas mês a mês?","line");
  var line=timeline.path("reply").path("presentation").path("blocks").valueStream().filter(block->block.path("type").asText().equals("line")).findFirst().orElseThrow();
  var months=line.path("items");
  assertThat(months.size()).isEqualTo(2);
  assertThat(months.path(0).path("label").asText()).isEqualTo("2026-02");
  assertThat(months.path(0).path("formattedValue").asText()).isEqualTo("R$ 390,01");
  assertThat(months.path(1).path("label").asText()).isEqualTo("2026-04");
  assertThat(months.path(1).path("formattedValue").asText()).isEqualTo("R$ 390,00");
 }
 @AfterAll void save() throws Exception {String file=System.getProperty("assistant.presentation.report");if(file!=null)Files.writeString(Path.of(file),mapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of("syntheticOnly",true,"providerCalls",calls,"minimumProviderIntervalMs",7000,"cases",report)));}
}
