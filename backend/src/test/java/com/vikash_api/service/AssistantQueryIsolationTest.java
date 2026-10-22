package com.vikash_api.service;

import com.vikash_api.assistant.*;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.exceptions.*;
import com.vikash_api.repositories.UserRepository;
import com.vikash_api.services.AuthenticatedUserService;
import java.math.BigDecimal;
import java.nio.file.*;
import java.sql.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.*;
import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Opt-in: PostgreSQL descartável, credenciais e dados exclusivamente fictícios. */
@EnabledIfEnvironmentVariable(named="VIKASH_ASSISTANT_EXECUTION_TEST",matches="true")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "spring.datasource.url=${ASSISTANT_TEST_DB_URL}","spring.datasource.username=assistant_test",
    "spring.datasource.password=${ASSISTANT_TEST_DB_PASSWORD}","spring.datasource.driver-class-name=org.postgresql.Driver",
    "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect","spring.jpa.hibernate.ddl-auto=create-drop",
    "assistant.planning.enabled=true","assistant.execution.enabled=true",
    "assistant.execution.jdbc-url=${ASSISTANT_TEST_DB_URL}","assistant.execution.password=${ASSISTANT_READER_TEST_PASSWORD}",
    "assistant.execution.pool-size=1","security.ai.per-minute=100","security.ai.global-per-day=1000"})
class AssistantQueryIsolationTest extends com.vikash_api.support.VerifiedUserFixture {
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository users;
    @Autowired AssistantQueryExecutor executor;
    @Autowired AssistantSqlValidator validator;
    @Autowired FinancialCatalog catalog;
    @Autowired AuthenticatedUserService auth;
    @Autowired ObjectMapper mapper;
    @MockitoBean AssistantGeminiClient gemini;
    UserEntity one,two;
    long institution,oneAccount;
    UUID otherAccountUuid;
    Path migrations;
    @BeforeAll void fixtures() throws Exception {
        assertThat(System.getenv("ASSISTANT_TEST_DB_URL")).contains("/assistant_catalog_test");
        migrations=Path.of(System.getProperty("basedir"),"migrations");
        migrate(); migrate(); // provisioning idempotente
        String password=System.getenv("ASSISTANT_READER_TEST_PASSWORD");
        assertThat(password).matches("[A-Za-z0-9_-]{30,100}");
        jdbc.execute("ALTER ROLE vikash_assistant_reader LOGIN PASSWORD '"+password+"'");
        institution=jdbc.queryForObject("INSERT INTO financial_institutions(name,logo_url) VALUES ('Banco fictício','test') RETURNING id",Long.class);
        one=fixtureUser("one");two=fixtureUser("two");
        oneAccount=fixtureData(one,100);fixtureData(two,900);
        otherAccountUuid=jdbc.queryForObject("SELECT uuid FROM accounts WHERE user_id=?",UUID.class,two.getId());
    }
    void migrate() throws Exception {
        try(var connection=jdbc.getDataSource().getConnection();var statement=connection.createStatement()) {
            for(String script:List.of("2026-10-16-assistant-financial-views.sql","2026-10-16-assistant-reader-permissions.sql","2026-10-16-assistant-query-results.sql"))
                statement.execute(Files.readString(migrations.resolve(script)));
        }
    }
    @BeforeEach void mockPlan() { when(gemini.plan(anyString(),anyList(),any())).thenReturn(plan("SELECT SUM(balance) AS total FROM assistant_finance.accounts","accounts")); }
    @AfterEach void clearAuth() { SecurityContextHolder.clearContext(); }
    UserEntity fixtureUser(String suffix) {
        UUID uuid=UUID.randomUUID();
        jdbc.update("INSERT INTO users(uuid,name,email,password,role,active,created_at,updated_at) VALUES (?,'Fictício',?,'fake','ROLE_USER',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",uuid,suffix+"@isolation.test");
        return users.findByEmail(suffix+"@isolation.test").orElseThrow();
    }
    long fixtureData(UserEntity user,int amount) {
        long account=jdbc.queryForObject("INSERT INTO accounts(uuid,user_id,financial_institution_id,description,type,balance,active,created_at,updated_at) VALUES (?,?,?,?,'CONTA_CORRENTE',?,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,UUID.randomUUID(),user.getId(),institution,"Conta "+amount,amount);
        long category=jdbc.queryForObject("INSERT INTO custom_categories(uuid,user_id,name,icon,color) VALUES (?,?,?,'tag','#ffffff') RETURNING id",Long.class,UUID.randomUUID(),user.getId(),"Categoria "+amount);
        jdbc.update("INSERT INTO transactions(uuid,user_id,account_id,description,amount,type,payment_method,custom_category_id,occurred_at,transcription,created_at,updated_at) VALUES (?,?,?,?,?,'EXPENSE','PIX',?,CURRENT_TIMESTAMP,'fictício',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",UUID.randomUUID(),user.getId(),account,"Despesa "+amount,amount,category);
        long card=jdbc.queryForObject("INSERT INTO credit_cards(uuid,user_id,financial_institution_id,last_four_digits,credit_limit,unallocated_used_limit,closing_day,due_day,active,created_at,updated_at) VALUES (?,?,?,1234,?,0,1,10,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,UUID.randomUUID(),user.getId(),institution,amount);
        long invoice=jdbc.queryForObject("INSERT INTO credit_card_invoices(uuid,credit_card_id,reference_month,initial_amount,closing_date,due_date,status,created_at,updated_at) VALUES (?,?,'2026-11',0,'2026-11-01','2026-11-10','OPEN',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,UUID.randomUUID(),card);
        long purchase=jdbc.queryForObject("INSERT INTO credit_card_purchases(uuid,credit_card_id,description,amount,installment_count,custom_category_id,occurred_at,transcription,created_at,updated_at) VALUES (?,?,?,?,1,?,CURRENT_TIMESTAMP,'fictício',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,UUID.randomUUID(),card,"Compra "+amount,amount,category);
        jdbc.update("INSERT INTO credit_card_installments(uuid,purchase_id,credit_card_invoice_id,installment_number,amount) VALUES (?,?,?,1,?)",UUID.randomUUID(),purchase,invoice,amount);
        return account;
    }
    FinancialPlan plan(String sql,String view) { return new FinancialPlan(catalog.version(),FinancialPlan.Decision.query,"Teste fictício",sql,List.of(),List.of("assistant_finance."+view),null); }
    AssistantQueryExecutor.QueryResult run(AssistantQueryExecutor target,UserEntity user,FinancialPlan plan) {
        var context=SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(user,"unused",List.of()));
        SecurityContextHolder.setContext(context);
        try { return target.execute(plan,validator.validate(plan)); } finally { SecurityContextHolder.clearContext(); }
    }
    BigDecimal amount(AssistantQueryExecutor.QueryResult result) {
        var rows=(List<?>)result.snapshot().get("rows");
        return new BigDecimal(((Map<?,?>)rows.getFirst()).get("total").toString());
    }
    AssistantQueryExecutor limited(Consumer<AssistantExecutionProperties> customize) {
        var p=new AssistantExecutionProperties();p.setEnabled(true);p.setJdbcUrl(System.getenv("ASSISTANT_TEST_DB_URL"));
        p.setPassword(System.getenv("ASSISTANT_READER_TEST_PASSWORD"));p.setPoolSize(1);customize.accept(p);
        return new AssistantQueryExecutor(p,validator,catalog,auth,mapper,"assistant_test");
    }
    Connection reader() throws SQLException { return DriverManager.getConnection(System.getenv("ASSISTANT_TEST_DB_URL"),"vikash_assistant_reader",System.getenv("ASSISTANT_READER_TEST_PASSWORD")); }
    void reason(Runnable action,String reason) { assertThatThrownBy(action::run).isInstanceOfSatisfying(AssistantQueryException.class,e->assertThat(e.getReason()).isEqualTo(reason)); }

    @Test void everyFinancialViewRestrictsRowsToAuthenticatedUuidOnReusedConnection() {
        var expressions=Map.of("accounts","balance","cards","credit_limit","transactions","amount","purchases","amount","installments","amount","invoices","total_amount");
        for(var entry:expressions.entrySet()) {
            var plan=plan("SELECT SUM("+entry.getValue()+") AS total FROM assistant_finance."+entry.getKey(),entry.getKey());
            assertThat(amount(run(executor,one,plan))).isEqualByComparingTo("100");
            assertThat(amount(run(executor,two,plan))).isEqualByComparingTo("900");
            assertThat(amount(run(executor,one,plan))).isEqualByComparingTo("100");
        }
        var categories=plan("SELECT category_name FROM assistant_finance.categories WHERE is_custom=true","categories");
        assertThat(run(executor,one,categories).snapshot().get("rows").toString()).contains("Categoria 100").doesNotContain("Categoria 900");
        assertThat(run(executor,two,categories).snapshot().get("rows").toString()).contains("Categoria 900").doesNotContain("Categoria 100");
    }
    @Test void concurrentUsersCannotBorrowAnotherUsersContext() throws Exception {
        var plan=plan("SELECT SUM(balance) AS total FROM assistant_finance.accounts","accounts");
        try(var threads=Executors.newFixedThreadPool(4)) {
            var futures=new ArrayList<Future<?>>();
            for(int i=0;i<12;i++) { var user=i%2==0?one:two;futures.add(threads.submit(()->assertThat(amount(run(executor,user,plan))).isEqualByComparingTo(user==one?"100":"900"))); }
            for(var future:futures) future.get(15,TimeUnit.SECONDS);
        }
    }
    @Test void missingUnknownOrInactiveUuidReturnsNoRowsAndNumericContextIsIgnored() throws Exception {
        try(var c=reader()) {
            c.setAutoCommit(false);
            for(String view:catalog.viewNames()) {
                try(var rows=c.createStatement().executeQuery("SELECT COUNT(*) FROM "+view)) { rows.next();assertThat(rows.getInt(1)).isZero(); }
            }
            try(var statement=c.prepareStatement("SELECT set_config('app.assistant_user_uuid',?,true),set_config('app.assistant_user_id',?,true)")) {
                statement.setString(1,UUID.randomUUID().toString());statement.setString(2,two.getId().toString());statement.execute();
            }
            try(var rows=c.createStatement().executeQuery("SELECT COUNT(*) FROM assistant_finance.accounts")) { rows.next();assertThat(rows.getInt(1)).isZero(); }
            c.rollback();
        }
        jdbc.update("UPDATE users SET active=false WHERE id=?",one.getId());
        try {
            assertThatThrownBy(()->run(executor,one,plan("SELECT COUNT(*) AS total FROM assistant_finance.accounts","accounts"))).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            try(var c=reader();var statement=c.prepareStatement("SELECT set_config('app.assistant_user_uuid',?,false)")) {
                statement.setString(1,one.getUuid().toString());statement.execute();
                try(var rows=c.createStatement().executeQuery("SELECT COUNT(*) FROM assistant_finance.accounts")) { rows.next();assertThat(rows.getInt(1)).isZero(); }
            }
        } finally { jdbc.update("UPDATE users SET active=true WHERE id=?",one.getId()); }
    }
    @Test void anotherAccountUuidInParametersDoesNotBypassViews() {
        var plan=new FinancialPlan(catalog.version(),FinancialPlan.Decision.query,"Fictício","SELECT balance FROM assistant_finance.accounts WHERE CAST(account_uuid AS text)=:account",List.of(new FinancialPlan.Parameter("account","text",otherAccountUuid.toString())),List.of("assistant_finance.accounts"),null);
        assertThat(run(executor,one,plan).snapshot().get("rowCount")).isEqualTo(0);
        assertThat(run(executor,two,plan).snapshot().get("rowCount")).isEqualTo(1);
    }
    @Test void readerCannotReadBaseTablesOrWriteEvenWhenReadonlySettingIsOverridden() throws Exception {
        for(String sql:List.of("SELECT email,password FROM public.users","SELECT balance FROM public.accounts","UPDATE public.accounts SET balance=0","DELETE FROM public.accounts","CREATE TABLE public.assistant_forbidden(id int)")) {
            try(var c=reader()) {
                c.createStatement().execute("SET default_transaction_read_only=off");
                assertThatThrownBy(()->c.createStatement().execute(sql)).isInstanceOf(SQLException.class);
            }
        }
        try(var c=reader()) {
            c.setReadOnly(true);c.setAutoCommit(false);
            assertThatThrownBy(()->c.createStatement().execute("CREATE TEMP TABLE forbidden AS SELECT 1")).isInstanceOf(SQLException.class);
            c.rollback();
        }
    }
    @Test void rejectsNewGrantsAndPrivilegedRoleBeforeQuery() {
        var plan=plan("SELECT SUM(balance) AS total FROM assistant_finance.accounts","accounts");
        jdbc.execute("GRANT SELECT ON public.users TO vikash_assistant_reader");
        try { reason(()->run(executor,one,plan),"ISOLATION_GUARD"); }
        finally { jdbc.execute("REVOKE SELECT ON public.users FROM vikash_assistant_reader"); }
        jdbc.execute("ALTER ROLE vikash_assistant_reader SUPERUSER");
        try { reason(()->run(executor,one,plan),"ISOLATION_GUARD"); }
        finally { jdbc.execute("ALTER ROLE vikash_assistant_reader NOSUPERUSER"); }
        jdbc.execute("ALTER ROLE vikash_assistant_view_owner LOGIN");
        try { reason(()->run(executor,one,plan),"ISOLATION_GUARD"); }
        finally { jdbc.execute("ALTER ROLE vikash_assistant_view_owner NOLOGIN"); }
        assertThat(amount(run(executor,two,plan))).isEqualByComparingTo("900");
    }
    @Test void estimatedCostRowsAndPlanComplexityAreCheckedBeforeExecution() {
        var plan=plan("SELECT SUM(balance) AS total FROM assistant_finance.accounts","accounts");
        try(var target=limited(p->p.setMaxEstimatedCost(new BigDecimal("0.01")))) { reason(()->run(target,one,plan),"COST_LIMIT"); }
        try(var target=limited(p->p.setMaxEstimatedRows(1))) { reason(()->run(target,one,plan("SELECT balance FROM assistant_finance.accounts UNION ALL SELECT balance FROM assistant_finance.accounts","accounts")),"COST_LIMIT"); }
        try(var target=limited(p->p.setMaxPlanNodes(1))) { reason(()->run(target,one,plan),"COST_LIMIT"); }
        assertThat(amount(run(executor,two,plan))).isEqualByComparingTo("900");
    }
    @Test void lockTimeoutReleasesConnectionAndOwnerContext() throws Exception {
        var plan=plan("SELECT SUM(balance) AS total FROM assistant_finance.accounts","accounts");
        try(var c=jdbc.getDataSource().getConnection()) {
            c.setAutoCommit(false);c.createStatement().execute("LOCK TABLE public.accounts IN ACCESS EXCLUSIVE MODE");
            assertTimeoutPreemptively(Duration.ofSeconds(4),()->reason(()->run(executor,one,plan),"TIME_LIMIT"));
            c.rollback();
        }
        assertThat(amount(run(executor,two,plan))).isEqualByComparingTo("900");
    }
    @Test void serverStatementTimeoutCancelsQueryWithoutPartialResult() throws Exception {
        String original=Files.readString(migrations.resolve("2026-10-16-assistant-financial-views.sql"));
        String slow=original.replace("WHERE a.user_id =","WHERE (SELECT pg_catalog.pg_sleep(0.6)) IS NOT NULL AND a.user_id =");
        jdbc.execute(slow);
        var plan=plan("SELECT SUM(balance) AS total FROM assistant_finance.accounts","accounts");
        try(var target=limited(p->p.setStatementTimeoutMs(100))) {
            assertTimeoutPreemptively(Duration.ofSeconds(4),()->reason(()->run(target,one,plan),"TIME_LIMIT"));
        } finally { jdbc.execute(original); }
        assertThat(amount(run(executor,two,plan))).isEqualByComparingTo("900");
    }
    @Test void oversizedCellsRowsAndPayloadsFailWithoutTruncation() {
        var text=plan("SELECT account_name FROM assistant_finance.accounts","accounts");
        try(var target=limited(p->p.setMaxCellChars(4))) { reason(()->run(target,one,text),"RESULT_LIMIT"); }
        try(var target=limited(p->p.setMaxResultBytes(128))) { reason(()->run(target,one,text),"RESULT_LIMIT"); }
        var rows=plan("SELECT balance FROM assistant_finance.accounts UNION ALL SELECT balance FROM assistant_finance.accounts","accounts");
        try(var target=limited(p->p.setMaxRows(1))) { reason(()->run(target,one,rows),"RESULT_LIMIT"); }
        assertThat(amount(run(executor,two,plan("SELECT SUM(balance) AS total FROM assistant_finance.accounts","accounts")))).isEqualByComparingTo("900");
    }
    @Test void executionRequiresAuthenticationAndMatchingValidationProof() {
        var plan=plan("SELECT SUM(balance) AS total FROM assistant_finance.accounts","accounts");
        assertThatThrownBy(()->executor.execute(plan,validator.validate(plan))).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        var other=plan("SELECT COUNT(*) AS total FROM assistant_finance.accounts","accounts");
        var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(one,"unused",List.of()));SecurityContextHolder.setContext(context);
        assertThatThrownBy(()->executor.execute(plan,validator.validate(other))).isInstanceOf(AssistantSqlRejectedException.class);
    }
    @Test void readerConnectionFailureNeverFallsBackToMainDatasource() {
        try(var target=limited(p->p.setPassword("fictional-wrong-password-that-is-long-enough"))) {
            reason(()->run(target,one,plan("SELECT SUM(balance) AS total FROM assistant_finance.accounts","accounts")),"READER_UNAVAILABLE");
        }
        assertThat(amount(run(executor,two,plan("SELECT SUM(balance) AS total FROM assistant_finance.accounts","accounts")))).isEqualByComparingTo("900");
    }
    @Test void resultProofIsBoundToOwnerAndAllParameterValues() {
        var first=new FinancialPlan(catalog.version(),FinancialPlan.Decision.query,"Teste","SELECT balance FROM assistant_finance.accounts WHERE balance>:minimum",List.of(new FinancialPlan.Parameter("minimum","decimal","0")),List.of("assistant_finance.accounts"),null);
        var changed=new FinancialPlan(first.catalogVersion(),first.decision(),first.interpretation(),first.sql(),List.of(new FinancialPlan.Parameter("minimum","decimal","500")),first.views(),null);
        var result=run(executor,one,first);
        assertThat(result.belongsTo(one.getUuid(),first,validator.validate(first).fingerprint())).isTrue();
        assertThat(result.belongsTo(two.getUuid(),first,validator.validate(first).fingerprint())).isFalse();
        assertThat(result.belongsTo(one.getUuid(),changed,validator.validate(changed).fingerprint())).isFalse();
    }
    RestClient client() { return RestClient.create("http://localhost:"+port); }
    AuthResponse register() {
        return createTestUser(Map.of("name","Fictício","email",UUID.randomUUID()+"@execution.test","password","Password123!"));
    }
    ResponseEntity<JsonNode> send(AuthResponse who,Map<String,Object> body) {
        var request=client().post().uri("/api/assistant/messages").contentType(MediaType.APPLICATION_JSON).header("Idempotency-Key",body.get("clientMessageId").toString());
        if(who!=null)request.header("Authorization","Bearer "+who.getAccessToken());
        return request.body(body).retrieve().onStatus(HttpStatusCode::isError,(q,r)->{}).toEntity(JsonNode.class);
    }
    @Test void chatUsesJwtOwnerKeepsResultInternalAndReplaysWithoutRunningAgain() {
        var a=register();var b=register();
        var user=users.findByEmail(a.getUser().getEmail()).orElseThrow();fixtureData(user,111);
        var input=new HashMap<String,Object>(Map.of("clientConversationId","c-"+UUID.randomUUID(),"clientMessageId","one","content","Saldo das minhas contas","userId",two.getId(),"userUuid",two.getUuid().toString()));
        var response=send(a,input);assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        var body=response.getBody();assertThat(body.path("status").asText()).isEqualTo("queried");
        assertThat(body.toString()).doesNotContain("SELECT","queryResult","total");
        UUID question=UUID.fromString(body.path("message").path("id").asText());
        var saved=jdbc.queryForMap("SELECT query_result_json,query_owner_uuid,query_execution_version FROM assistant_messages WHERE uuid=?",question);
        assertThat(saved.get("query_owner_uuid")).isEqualTo(user.getUuid());
        assertThat(mapper.readTree(saved.get("query_result_json").toString()).path("rows").path(0).path("total").asInt()).isEqualTo(111);
        jdbc.update("UPDATE accounts SET balance=222 WHERE user_id=?",user.getId());
        assertThat(send(a,input).getBody()).isEqualTo(body);verify(gemini,times(1)).plan(anyString(),anyList(),any());
        assertThat(send(null,input).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        input.put("conversationId",body.path("conversationId").asText());input.put("clientMessageId","steal");
        assertThat(send(b,input).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(send(a,Map.of("clientConversationId","c-"+UUID.randomUUID(),"clientMessageId","two","content","Saldo atual" )).getBody().path("status").asText()).isEqualTo("queried");
    }
    @Test void rejectedCostReturnsSafeErrorAndStoresNoPartialResult() {
        // VIEW confiável modificada só neste PostgreSQL descartável para simular plano caro.
        String view="CREATE OR REPLACE VIEW assistant_finance.accounts WITH (security_barrier=true) AS SELECT a.uuid AS account_uuid,a.description::text AS account_name,a.type::text AS account_type,COALESCE(f.name,'Carteira')::text AS institution_name,a.balance,a.active FROM public.accounts a LEFT JOIN public.financial_institutions f ON f.id=a.financial_institution_id CROSS JOIN generate_series(1,10000000) g WHERE a.user_id=(SELECT id FROM public.users WHERE uuid=NULLIF(current_setting('app.assistant_user_uuid',true),'')::uuid AND active)";
        jdbc.execute(view);
        try {
            var response=send(register(),Map.of("clientConversationId","cost-"+UUID.randomUUID(),"clientMessageId","cost","content","Consultar saldo"));
            assertThat(response.getStatusCode().value()).isEqualTo(422);
            assertThat(response.getBody().path("code").asText()).isEqualTo("ASSISTANT_QUERY_COST_LIMIT");
            assertThat(response.getBody().toString()).doesNotContain("SELECT","generate_series","password");
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM assistant_messages WHERE status='query_failed' AND query_failure_reason='COST_LIMIT' AND query_result_json IS NULL",Integer.class)).isEqualTo(1);
        } finally {
            try { jdbc.execute(Files.readString(migrations.resolve("2026-10-16-assistant-financial-views.sql"))); } catch(Exception e) { throw new IllegalStateException(e); }
        }
    }
}
