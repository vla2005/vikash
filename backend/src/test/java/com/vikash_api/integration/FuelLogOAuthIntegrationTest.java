package com.vikash_api.integration;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.math.BigDecimal;
import java.util.regex.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.entities.AccountEntity;
import com.vikash_api.enums.AccountType;
import com.vikash_api.repositories.*;
import com.vikash_api.services.AiAnalysisService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
 "spring.datasource.url=jdbc:h2:mem:fuellog-oauth;DB_CLOSE_DELAY=-1",
 "integrations.fuellog.enabled=true",
 "integrations.fuellog.web-return-uri=http://127.0.0.1:9192/vikash-return",
 "integrations.fuellog.native-return-uri=fuellog://vikash-return",
 "integrations.fuellog.issuer=http://127.0.0.1:8080",
 "integrations.fuellog.client-secret-hash={noop}local-test-only-secret",
 "integrations.fuellog.redirect-uri=http://127.0.0.1:9191/callback",
 "security.login.origin-limit=1000"
})
class FuelLogOAuthIntegrationTest extends com.vikash_api.support.VerifiedUserFixture {
 @LocalServerPort int port;
 @Autowired UserRepository users;
 @Autowired AccountRepository accounts;
 @Autowired JdbcTemplate jdbc;
 @Autowired tools.jackson.databind.ObjectMapper applicationJson;
 @MockitoBean AiAnalysisService ai;
 final ObjectMapper json=new ObjectMapper();
 final HttpClient http=HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();
 AuthResponse auth;
 String email;
 @BeforeEach void fixture() {
  email=UUID.randomUUID()+"@fuellog.test";
  auth=createTestUser(Map.of("name","Conta FuelLog","email",email,"password","SyntheticPassword123!"));
  if(jdbc.queryForObject("select count(*) from default_categories",Integer.class)==0)
   jdbc.update("insert into default_categories(name,icon,color) values (?,?,?)","Combustível","fuel","#ECAA41");
 }
 String base() {return "http://127.0.0.1:"+port;}
 static String enc(String s) {return URLEncoder.encode(s,StandardCharsets.UTF_8);}
 HttpResponse<String> get(HttpClient client,String path) throws Exception {
  return client.send(HttpRequest.newBuilder(URI.create(path.startsWith("http")?path:base()+path)).header("Accept","text/html").build(),HttpResponse.BodyHandlers.ofString());
 }
 HttpResponse<String> post(HttpClient client,String path,String body,boolean basic) throws Exception {
  var request=HttpRequest.newBuilder(URI.create(base()+path)).header("Content-Type","application/x-www-form-urlencoded");
  if(basic)request.header("Authorization","Basic "+Base64.getEncoder().encodeToString("fuellog:local-test-only-secret".getBytes(StandardCharsets.UTF_8)));
  return client.send(request.POST(HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
 }
 static String field(String html,String name) {
  var match=Pattern.compile("name=['\"]"+name+"['\"] value=['\"]([^'\"]+)['\"]").matcher(html);
  assertThat(match.find()).as("hidden field "+name).isTrue();return match.group(1);
 }
 static String query(String uri,String name) {
  return Arrays.stream(URI.create(uri).getRawQuery().split("&")).map(p->p.split("=",2))
    .filter(p->URLDecoder.decode(p[0],StandardCharsets.UTF_8).equals(name))
    .map(p->URLDecoder.decode(p.length==2?p[1]:"",StandardCharsets.UTF_8)).findFirst().orElseThrow();
 }
 String authorization(String scopes,String state,String challenge,String method,String callback) {
  return "/oauth2/authorize?response_type=code&client_id=fuellog&redirect_uri="+enc(callback)+"&scope="+enc(scopes)+"&state="+enc(state)
   +"&code_challenge="+enc(challenge)+"&code_challenge_method="+method;
 }
 record Pending(HttpClient browser,String url,String verifier,String state) {}
 Pending pending(String scopes) throws Exception {
  String verifier=UUID.randomUUID().toString()+UUID.randomUUID();
  String challenge=Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII)));
  byte[] stateBytes=new byte[32];
  new java.security.SecureRandom().nextBytes(stateBytes);
  String state=Base64.getUrlEncoder().withoutPadding().encodeToString(stateBytes);
  var browser=HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).followRedirects(HttpClient.Redirect.NEVER).build();
  String url=authorization(scopes,state,challenge,"S256","http://127.0.0.1:9191/callback");
  var first=get(browser,url);
  assertThat(first.statusCode()).isEqualTo(302);
  var page=get(browser,"/connect/login");
  assertThat(page.statusCode()).isEqualTo(200);
  var login=post(browser,"/connect/login","username="+enc(email)+"&password="+enc("SyntheticPassword123!")+"&_csrf="+enc(field(page.body(),"_csrf")),false);
  assertThat(login.statusCode()).isEqualTo(302);
  return new Pending(browser,url,verifier,state);
 }
 record Code(String value,String verifier,String state) {}
 Code code(String scopes) throws Exception {
  var p=pending(scopes);
  var redirected=get(p.browser(),p.url());
  assertThat(redirected.statusCode()).isEqualTo(302);
  String consent=redirected.headers().firstValue("Location").orElseThrow();
  assertThat(consent).contains("/connect/consent");
  var page=get(p.browser(),consent);
  assertThat(page.statusCode()).isEqualTo(200);
  assertThat(page.body()).contains("Conta FuelLog","Autorizar vínculo").doesNotContain(email);
  String body="client_id=fuellog&state="+enc(field(page.body(),"state"))+"&_csrf="+enc(field(page.body(),"_csrf"));
  for(String scope:scopes.split(" "))body+="&scope="+enc(scope);
  var approved=post(p.browser(),"/oauth2/authorize",body,false);
  assertThat(approved.statusCode()).isEqualTo(302);
  String callback=approved.headers().firstValue("Location").orElseThrow();
  assertThat(query(callback,"state")).isEqualTo(p.state());
  return new Code(query(callback,"code"),p.verifier(),p.state());
 }
 HttpResponse<String> exchange(Code code,String verifier) throws Exception {
  return post(http,"/oauth2/token","grant_type=authorization_code&code="+enc(code.value())+"&redirect_uri="+enc("http://127.0.0.1:9191/callback")+"&code_verifier="+enc(verifier),true);
 }
 Map<String,Object> tokens(String scopes) throws Exception {
  var code=code(scopes);
  var response=exchange(code,code.verifier());
  assertThat(response.statusCode()).as("OAuth token exchange").isEqualTo(200);
  return json.readValue(response.body(),Map.class);
 }
 HttpResponse<String> resource(String method,String token,String path,Object body,String header,String value) throws Exception {
  var r=HttpRequest.newBuilder(URI.create(base()+path)).header("Authorization","Bearer "+token);
  if(header!=null)r.header(header,value);
  if(body!=null)r.header("Content-Type","application/json");
  return http.send(r.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
 }
 AccountEntity account() {
  var a=new AccountEntity();a.setUser(users.findByUuid(auth.getUser().getUuid()).orElseThrow());
  a.setType(AccountType.CARTEIRA);a.setDescription("Carteira");a.setActive(true);a.setBalance(new BigDecimal("1000.00"));
  return accounts.saveAndFlush(a);
 }
 Map<String,Object> payload(AccountEntity a,long version) {
  var m=new HashMap<String,Object>();
  m.put("version",version);m.put("occurredAt","2026-11-01T12:00:00-03:00");m.put("timeZone","America/Sao_Paulo");
  m.put("amount",new BigDecimal("251.60"));m.put("currency","BRL");m.put("description","Abastecimento de teste");
  m.put("fuel","GASOLINE");m.put("liters",new BigDecimal("40.000"));
  Long category=jdbc.queryForObject("select min(id) from default_categories",Long.class);
  m.put("categoryId","default:"+category);m.put("paymentMethod","PIX");m.put("accountUuid",a.getUuid().toString());m.put("installmentCount",1);return m;
 }
 @Test void structuredJsonPreservesTheExplicitOffset() throws Exception {
  var parsed=applicationJson.readValue(json.writeValueAsString(payload(account(),1)),com.vikash_api.integrations.fuellog.FuelLogRequests.Upsert.class);
  assertThat(parsed.occurredAt().getOffset()).isEqualTo(java.time.ZoneOffset.ofHours(-3));
 }
 @Test void publishesOnlyTheDelegatedAuthorizationGrants() throws Exception {
  var result=get(http,"/.well-known/oauth-authorization-server");
  assertThat(result.statusCode()).isEqualTo(200);
  assertThat(result.body()).contains("authorization_code","refresh_token","S256").doesNotContain("client_credentials");
 }
 @Test void authorizationRequiresPkceAndNeverRedirectsToAnUnregisteredCallback() throws Exception {
  String url=authorization("fuellog.catalog",UUID.randomUUID().toString(),"short","plain","http://127.0.0.1:9191/callback");
  var rejected=get(http,url);
  assertThat(rejected.statusCode()).isIn(302,400);
  if(rejected.statusCode()==302)assertThat(rejected.headers().firstValue("Location").orElse("")).contains("error=invalid_request");
  var changed=get(http,authorization("fuellog.catalog",UUID.randomUUID().toString(),"x".repeat(43),"S256","https://attacker.invalid/callback"));
  assertThat(changed.statusCode()).isEqualTo(400);
  assertThat(changed.headers().firstValue("Location")).isEmpty();
 }
 @Test void consentAllowsOnlyConfiguredClientReturnTargetsAndKeepsLoginSameOrigin() throws Exception {
  var pending=pending("fuellog.catalog");
  var consent=get(pending.browser(),get(pending.browser(),pending.url()).headers().firstValue("Location").orElseThrow());
  assertThat(consent.headers().firstValue("Content-Security-Policy").orElseThrow())
   .contains("default-src 'none'", "frame-ancestors 'none'", "base-uri 'none'",
     "form-action 'self' http://127.0.0.1:9191 http://127.0.0.1:9192 fuellog://vikash-return;")
   .doesNotContain("https://attacker.invalid", "form-action *");
  assertThat(get(http,"/connect/login").headers().firstValue("Content-Security-Policy").orElseThrow())
   .contains("form-action 'self';", "default-src 'none'", "frame-ancestors 'none'");
 }
 @Test void loginAndConsentRequireCsrfAndDenyReturnsOriginalState() throws Exception {
  assertThat(post(http,"/connect/login","username="+enc(email)+"&password=fake",false).statusCode()).isEqualTo(403);
  var p=pending("fuellog.catalog");
  var location=get(p.browser(),p.url()).headers().firstValue("Location").orElseThrow();
  var page=get(p.browser(),location);
  String state=field(page.body(),"state");
  assertThat(post(p.browser(),"/oauth2/authorize","client_id=fuellog&state="+enc(state)+"&scope=fuellog.catalog",false).statusCode()).isEqualTo(403);
  var denied=post(p.browser(),"/oauth2/authorize","client_id=fuellog&state="+enc(state)+"&_csrf="+enc(field(page.body(),"_csrf")),false);
  String callback=denied.headers().firstValue("Location").orElseThrow();
  assertThat(query(callback,"error")).isEqualTo("access_denied");
  assertThat(query(callback,"state")).isEqualTo(p.state());
 }
 @Test void codeIsBoundToVerifierAndCanOnlyBeExchangedOnce() throws Exception {
  var c=code("fuellog.catalog");
  assertThat(exchange(c,"x".repeat(64)).statusCode()).isEqualTo(400);
  var fresh=code("fuellog.catalog");
  assertThat(exchange(fresh,fresh.verifier()).statusCode()).isEqualTo(200);
  assertThat(exchange(fresh,fresh.verifier()).statusCode()).isEqualTo(400);
 }
 @Test void delegatedCredentialsAreSeparatedFromNormalSessionsAndScopesAreEnforced() throws Exception {
  var t=tokens("fuellog.catalog");String access=t.get("access_token").toString();
  assertThat(access.split("\\.")).hasSize(1);
  assertThat(resource("GET",access,"/api/integrations/v1/fuellog/catalog",null,null,null).statusCode()).isEqualTo(200);
  assertThat(resource("GET",access,"/api/integrations/v1/fuellog/refuelings/other",null,null,null).statusCode()).isEqualTo(403);
  assertThat(resource("GET",access,"/api/auth/me",null,null,null).statusCode()).isIn(401,403);
  assertThat(resource("GET",auth.getAccessToken(),"/api/integrations/v1/fuellog/catalog",null,null,null).statusCode()).isEqualTo(401);
 }
 @Test void refreshRotatesAndRevokingRefreshAlsoInvalidatesItsAccess() throws Exception {
  var t=tokens("fuellog.catalog fuellog.entries");
  String old=t.get("refresh_token").toString();
  var renewed=post(http,"/oauth2/token","grant_type=refresh_token&refresh_token="+enc(old),true);
  assertThat(renewed.statusCode()).isEqualTo(200);
  var next=json.readValue(renewed.body(),Map.class);
  assertThat(next.get("refresh_token")).isNotEqualTo(old);
  assertThat(post(http,"/oauth2/token","grant_type=refresh_token&refresh_token="+enc(old),true).statusCode()).isEqualTo(400);
  assertThat(post(http,"/oauth2/revoke","token="+enc(next.get("refresh_token").toString())+"&token_type_hint=refresh_token",true).statusCode()).isEqualTo(200);
  assertThat(post(http,"/oauth2/revoke","token="+enc(next.get("refresh_token").toString())+"&token_type_hint=refresh_token",true).statusCode()).isEqualTo(200);
  assertThat(resource("GET",next.get("access_token").toString(),"/api/integrations/v1/fuellog/catalog",null,null,null).statusCode()).isEqualTo(401);
 }
 @Test void expiredAccessIsRejected() throws Exception {
  var t=tokens("fuellog.catalog");String token=t.get("access_token").toString();
  jdbc.update("update oauth2_authorization set access_token_issued_at = ?, access_token_expires_at = ? where access_token_value = ?",java.sql.Timestamp.from(Instant.now().minusSeconds(600)),java.sql.Timestamp.from(Instant.now().minusSeconds(10)),token);
  assertThat(resource("GET",token,"/api/integrations/v1/fuellog/catalog",null,null,null).statusCode()).isEqualTo(401);
 }
 @Test void concurrentRetriesCommitOnlyOneExpenseAndTimeoutCanBeReconciledByGet() throws Exception {
  var a=account();String token=tokens("fuellog.catalog fuellog.entries").get("access_token").toString();
  var body=payload(a,1);String path="/api/integrations/v1/fuellog/refuelings/concurrent-"+UUID.randomUUID();
  var pool=Executors.newFixedThreadPool(2);
  try {
   var start=new CountDownLatch(1);
   Callable<HttpResponse<String>> send=()->{start.await();return resource("PUT",token,path,body,"If-None-Match","*");};
   var f1=pool.submit(send);var f2=pool.submit(send);start.countDown();
   var first=f1.get(20,TimeUnit.SECONDS);var second=f2.get(20,TimeUnit.SECONDS);
   assertThat(List.of(first.statusCode(),second.statusCode())).as("HTTP responses: %s / %s",first.body(),second.body()).containsExactlyInAnyOrder(201,200);
  } finally {pool.shutdownNow();}
  assertThat(accounts.findByUuid(a.getUuid()).orElseThrow().getBalance()).isEqualByComparingTo("748.40");
  var result=resource("GET",token,path,null,null,null);
  assertThat(result.statusCode()).isEqualTo(200);
  assertThat(json.readValue(result.body(),Map.class).get("version")).isEqualTo(1);
  assertThat(result.headers().firstValue("ETag")).isPresent();
  var retry=resource("PUT",token,path,body,"If-None-Match","*");
  assertThat(retry.statusCode()).isEqualTo(200);
  assertThat(retry.headers().firstValue("ETag")).isEqualTo(result.headers().firstValue("ETag"));
  verifyNoInteractions(ai);
 }
 @Test void usersAndNewAuthorizationsCannotSeeOrModifyAnotherLinksEntries() throws Exception {
  var ownerAccount=account();var body=payload(ownerAccount,1);
  String owner=tokens("fuellog.catalog fuellog.entries").get("access_token").toString();
  String path="/api/integrations/v1/fuellog/refuelings/isolation-"+UUID.randomUUID();
  var created=resource("PUT",owner,path,body,"If-None-Match","*");
  assertThat(created.statusCode()).as(created.body()).isEqualTo(201);
  String secondLink=tokens("fuellog.catalog fuellog.entries").get("access_token").toString();
  assertThat(resource("GET",secondLink,path,null,null,null).statusCode()).isEqualTo(404);
  assertThat(resource("DELETE",secondLink,path+"?version=2",null,"If-Match",created.headers().firstValue("ETag").orElseThrow()).statusCode()).isEqualTo(404);
  email=UUID.randomUUID()+"@fuellog.test";
  auth=createTestUser(Map.of("name","Conta FuelLog","email",email,"password","SyntheticPassword123!"));
  String other=tokens("fuellog.catalog fuellog.entries").get("access_token").toString();
  assertThat(resource("GET",other,path,null,null,null).statusCode()).isEqualTo(404);
  var foreignReference=resource("PUT",other,path,body,"If-None-Match","*");
  assertThat(foreignReference.statusCode()).isEqualTo(422);
  assertThat(foreignReference.body()).contains("INVALID_REFERENCE");
  var catalog=resource("GET",other,"/api/integrations/v1/fuellog/catalog",null,null,null);
  assertThat(catalog.statusCode()).isEqualTo(200);
  assertThat(catalog.body()).doesNotContain(ownerAccount.getUuid().toString(),"balance","creditLimit");
  assertThat(accounts.findByUuid(ownerAccount.getUuid()).orElseThrow().getBalance()).isEqualByComparingTo("748.40");
 }
 @Test void concurrentRefreshAcceptsOneUseOfThePreviousToken() throws Exception {
  String refresh=tokens("fuellog.catalog").get("refresh_token").toString();
  var pool=Executors.newFixedThreadPool(2);var start=new CountDownLatch(1);
  try {
   Callable<Integer> renew=()->{start.await();return post(http,"/oauth2/token","grant_type=refresh_token&refresh_token="+enc(refresh),true).statusCode();};
   var first=pool.submit(renew);var second=pool.submit(renew);start.countDown();
   assertThat(List.of(first.get(20,TimeUnit.SECONDS),second.get(20,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,400);
  } finally {pool.shutdownNow();}
 }
 @Test void switchingAccountsRestartsTheSamePkceAttempt() throws Exception {
  var p=pending("fuellog.catalog");
  var consentLocation=get(p.browser(),p.url()).headers().firstValue("Location").orElseThrow();
  var page=get(p.browser(),consentLocation);
  var switched=post(p.browser(),"/connect/switch","state="+enc(field(page.body(),"state"))+"&_csrf="+enc(field(page.body(),"_csrf")),false);
  assertThat(switched.statusCode()).isEqualTo(302);
  String restart=switched.headers().firstValue("Location").orElseThrow();
  assertThat(query(restart,"state")).isEqualTo(p.state());
  assertThat(query(restart,"code_challenge_method")).isEqualTo("S256");
  var loginNeeded=get(p.browser(),restart);
  assertThat(loginNeeded.headers().firstValue("Location").orElse("")).contains("/connect/login");
 }
 @Test void anAdulteratedConsentStateCannotAuthorizeAnotherAttempt() throws Exception {
  var p=pending("fuellog.catalog");
  var page=get(p.browser(),get(p.browser(),p.url()).headers().firstValue("Location").orElseThrow());
  var forged=post(p.browser(),"/oauth2/authorize","client_id=fuellog&state="+enc(UUID.randomUUID().toString())+"&scope=fuellog.catalog&_csrf="+enc(field(page.body(),"_csrf")),false);
  assertThat(forged.statusCode()).isEqualTo(400);
  assertThat(forged.headers().firstValue("Location")).isEmpty();
 }

}
