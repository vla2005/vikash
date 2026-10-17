package com.vikash_api.service;
import com.vikash_api.assistant.*;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.repositories.UserRepository;
import java.nio.file.*;
import java.math.BigDecimal;
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
import org.springframework.web.client.RestClient;
import tools.jackson.databind.*;
import static org.assertj.core.api.Assertions.*;

/** Gemini real, dois usuários fictícios e mensagens intermediárias sintéticas fora da janela. */
@EnabledIfEnvironmentVariable(named="VIKASH_ASSISTANT_MEMORY_LIVE_TEST",matches="true")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
 "spring.datasource.url=${ASSISTANT_TEST_DB_URL}","spring.datasource.username=assistant_test","spring.datasource.password=${ASSISTANT_TEST_DB_PASSWORD}",
 "spring.datasource.driver-class-name=org.postgresql.Driver","spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect","spring.jpa.hibernate.ddl-auto=create-drop","spring.jpa.open-in-view=false",
 "assistant.planning.enabled=true","assistant.execution.enabled=true","assistant.answer.enabled=true","assistant.memory.enabled=true","assistant.execution.jdbc-url=${ASSISTANT_TEST_DB_URL}",
 "assistant.execution.password=${ASSISTANT_READER_TEST_PASSWORD}","assistant.execution.pool-size=1","security.ai.per-minute=100","security.ai.per-day=100","security.ai.global-per-day=1000",
 "gemini.api.key=${ASSISTANT_LIVE_GEMINI_API_KEY}","gemini.api.url=https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"})
class AssistantMemoryLiveTest {
 @LocalServerPort int port;@Autowired JdbcTemplate jdbc;@Autowired UserRepository users;@Autowired ObjectMapper mapper;@Autowired AssistantMemory memory;
 RestClient client;AuthResponse a,b;long ownerId;String local="memory-live-"+UUID.randomUUID();final List<Map<String,Object>> report=new ArrayList<>();
 @BeforeAll void setup() throws Exception {
  new AssistantAnswerPostgresFixture(jdbc).provision();
  var factory=new SimpleClientHttpRequestFactory();factory.setConnectTimeout(5000);factory.setReadTimeout(100000);client=RestClient.builder().baseUrl("http://localhost:"+port).requestFactory(factory).build();
  a=register();b=register();ownerId=users.findByEmail(a.getUser().getEmail()).orElseThrow().getId();
  long inter=bank("Inter"),nu=bank("Nubank"),ai=account(ownerId,inter,"1000"),an=account(ownerId,nu,"2000");
  var f=new AssistantAnswerPostgresFixture(jdbc);long mercado=f.category(ownerId,"Mercado"),transporte=f.category(ownerId,"Transporte");
  expense(f,ai,mercado,"150",0,"PIX");expense(f,ai,mercado,"20",0,"DEBIT_CARD");expense(f,ai,transporte,"45",0,"PIX");expense(f,an,mercado,"75",0,"PIX");expense(f,an,transporte,"90",0,"PIX");
  expense(f,ai,mercado,"13.50",-1,"PIX");expense(f,ai,transporte,"4",-1,"PIX");expense(f,an,mercado,"7",-1,"PIX");expense(f,an,transporte,"23.40",-1,"PIX");expense(f,ai,mercado,"2.10",-1,"DEBIT_CARD");
  long other=users.findByEmail(b.getUser().getEmail()).orElseThrow().getId(),otherAccount=account(other,inter,"9999.99");
  long otherCategory=f.category(other,"Mercado");f.expense(other,otherAccount,otherCategory,"Dado de outro usuário","8888.88",0,"EXPENSE");
 }
 AuthResponse register(){return client.post().uri("/api/auth/register").contentType(MediaType.APPLICATION_JSON).body(Map.of("name","Fictício","email",UUID.randomUUID()+"@memory-live.test","password","Password123!")).retrieve().body(AuthResponse.class);}
 long bank(String name){return jdbc.queryForObject("INSERT INTO financial_institutions(name,logo_url) VALUES (?,'test') RETURNING id",Long.class,name);}
 long account(long owner,long bank,String balance){return jdbc.queryForObject("INSERT INTO accounts(uuid,user_id,financial_institution_id,description,type,balance,active,created_at,updated_at) VALUES (?,?,?,'Conta fictícia','CONTA_CORRENTE',?,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,UUID.randomUUID(),owner,bank,new BigDecimal(balance));}
 void expense(AssistantAnswerPostgresFixture f,long account,long category,String amount,int offset,String method){String description="Fictício "+UUID.randomUUID();f.expense(ownerId,account,category,description,amount,offset,"EXPENSE");jdbc.update("UPDATE transactions SET payment_method=? WHERE user_id=? AND description=?",method,ownerId,description);}
 AssistantMemory.State state(){var row=jdbc.queryForMap("SELECT uuid,memory_json,memory_hash FROM assistant_conversations WHERE user_id=? AND client_id=?",ownerId,local);return memory.restore((String)row.get("memory_json"),(String)row.get("memory_hash"),UUID.fromString(a.getUser().getUuid().toString()),(UUID)row.get("uuid"),Long.MAX_VALUE).orElseThrow();}
 JsonNode ask(AuthResponse who,String name,String question,String status,String... expected) throws Exception {
  Thread.sleep(8000); // ritmo do teste respeita a cota do provedor
  var payload=Map.of("clientConversationId",local,"clientMessageId",name,"content",question);
  long start=System.nanoTime();var response=send(who,payload);int attempts=1;
  if(response.getStatusCode().value()==503){Thread.sleep(8000);attempts++;response=send(who,payload);}
  var entry=new LinkedHashMap<String,Object>();entry.put("case",name);entry.put("http",response.getStatusCode().value());entry.put("attempts",attempts);entry.put("durationMs",(System.nanoTime()-start)/1000000);report.add(entry);
  assertThat(response.getStatusCode().value()).as(name+" "+response.getBody().path("code").asText()).isIn(200,201);
  var body=response.getBody();assertThat(body.path("status").asText()).as(name).isEqualTo(status);
  String text=body.path("reply").path("content").asText();entry.put("answer",text);for(String value:expected)assertThat(text).containsIgnoringCase(value);
  assertThat(text).doesNotContain("8.888","9.999","{{","SELECT");
  if(who==a){var memory=state();entry.put("memory",memory.view());entry.put("revision",memory.revision());assertThat(memory.view().summary().length()).isLessThanOrEqualTo(1400);}
  entry.put("passed",true);assertThat(send(who,payload).getBody()).isEqualTo(body);return body;
 }
 ResponseEntity<JsonNode> send(AuthResponse who,Map<String,String> payload){return client.post().uri("/api/assistant/messages").contentType(MediaType.APPLICATION_JSON).header("Authorization","Bearer "+who.getAccessToken()).header("Idempotency-Key",payload.get("clientMessageId")).body(payload).retrieve().onStatus(HttpStatusCode::isError,(q,r)->{}).toEntity(JsonNode.class);}
 void addNeutralTurns(int count){
  long conversation=jdbc.queryForObject("SELECT id FROM assistant_conversations WHERE user_id=? AND client_id=?",Long.class,ownerId,local);
  for(int i=0;i<count;i++) {
   UUID q=UUID.randomUUID(),reply=UUID.randomUUID();
   jdbc.update("INSERT INTO assistant_messages(uuid,conversation_id,client_id,role,content,status,created_at,reply_uuid) VALUES (?,?,?,'user','Continue com os mesmos critérios já definidos.','answered',CURRENT_TIMESTAMP,?)",q,conversation,"neutral-"+q,reply);
   jdbc.update("INSERT INTO assistant_messages(uuid,conversation_id,client_id,role,content,status,created_at) VALUES (?,?,?,'assistant','Seguimos com os critérios já definidos.','sent',CURRENT_TIMESTAMP)",reply,conversation,"reply-"+q);
  }
  var recent=jdbc.queryForList("SELECT content FROM assistant_messages WHERE conversation_id=? ORDER BY id DESC LIMIT 12",String.class,conversation);
  assertThat(recent).allMatch(text->!text.contains("Inter")&&!text.contains("Nubank")&&!text.contains("Mercado")&&!text.contains("Transporte"));
 }
 @AfterAll void saveReport() throws Exception {String file=System.getProperty("assistant.memory.report");if(file!=null)Files.writeString(Path.of(file),mapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of("model","gemini-3.5-flash-lite","syntheticOnly",true,"cases",report)));}
 @Test void longConversationPreservesCorrectsClearsAndResetsFilters() throws Exception {
  ask(a,"initial","Quero acompanhar o total de despesas de consumo das contas do Inter, na categoria Mercado, pagas por Pix neste mês.","answered","150,00");
  assertThat(state().view().filters()).containsKeys("institution","category","paymentMethod","period");
  addNeutralTurns(8);ask(a,"older_than_window","E no mês passado?","answered","13,50");
  assertThat(state().view().filters().get("institution")).containsIgnoringCase("Inter");assertThat(state().view().filters().get("category")).containsIgnoringCase("Mercado");
  ask(a,"correction","Na verdade considere Nubank e a categoria Transporte, mantendo Pix e o período.","answered","23,40");
  assertThat(state().view().filters().get("institution")).containsIgnoringCase("Nubank");assertThat(state().view().filters().get("category")).containsIgnoringCase("Transporte");
  addNeutralTurns(8);ask(a,"corrected_outside_window","E quanto deu?","answered","23,40");
  ask(a,"clear_filters","Agora considere todos os bancos, todas as categorias e qualquer método, mantendo o período.","answered","50,00");
  assertThat(state().view().filters()).doesNotContainKeys("institution","category","paymentMethod");
  ask(a,"new_subject","Esqueça os critérios anteriores. Quero o saldo atual de todas as minhas contas.","answered","3.000,00");assertThat(state().view().filters()).doesNotContainKey("period");
  ask(b,"other_user","E quanto deu?","clarification");
  local="memory-new-"+UUID.randomUUID();ask(a,"other_conversation","E quanto deu?","clarification");assertThat(state().view().filters()).doesNotContainKeys("institution","category","paymentMethod","period");
  local="memory-legacy-"+UUID.randomUUID();
  long legacy=jdbc.queryForObject("INSERT INTO assistant_conversations(uuid,user_id,client_id,title,created_at,updated_at) VALUES (?,?,?,'Legado fictício',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,UUID.randomUUID(),ownerId,local);
  UUID initial=UUID.randomUUID(),reply=UUID.randomUUID();
  jdbc.update("INSERT INTO assistant_messages(uuid,conversation_id,client_id,role,content,status,created_at,reply_uuid) VALUES (?,?,?,'user','Quero acompanhar o total de despesas de consumo das contas do Inter, categoria Mercado, pagas por Pix neste mês.','answered',CURRENT_TIMESTAMP,?)",initial,legacy,"legacy-initial",reply);
  jdbc.update("INSERT INTO assistant_messages(uuid,conversation_id,client_id,role,content,status,created_at) VALUES (?,?,?,'assistant','Seguimos com esses critérios.','sent',CURRENT_TIMESTAMP)",reply,legacy,"legacy-reply");
  addNeutralTurns(8);
  ask(a,"legacy_bootstrap","E no mês passado?","answered","13,50");assertThat(state().view().filters().get("institution")).containsIgnoringCase("Inter");

 }
}
