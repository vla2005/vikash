package com.vikash_api.integration;

import static org.assertj.core.api.Assertions.assertThat;
import java.net.URI;
import java.net.http.*;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ApplicationContext;
import com.vikash_api.integrations.fuellog.FuelLogAuthorizationStore;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
 "integrations.fuellog.enabled=false", "spring.datasource.url=jdbc:h2:mem:fuellog-disabled;DB_CLOSE_DELAY=-1"
})
class FuelLogDisabledIntegrationTest extends com.vikash_api.support.VerifiedUserFixture {
 @LocalServerPort int port;
 @Autowired ApplicationContext context;
 @Test void disabledIntegrationDoesNotOpenDelegatedRoutesOrBreakNormalSessions() throws Exception {
  assertThat(context.getBeansOfType(FuelLogAuthorizationStore.class)).isEmpty();
  var session=createTestUser(Map.of("name","Teste","email",UUID.randomUUID()+"@fuellog.test","password","SyntheticPassword123!"));
  var http=HttpClient.newHttpClient();
  for(String path:new String[]{"/api/integrations/v1/fuellog/catalog","/oauth2/authorize","/connect/login"}) {
   var response=http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).header("Authorization","Bearer "+session.getAccessToken()).build(),HttpResponse.BodyHandlers.discarding());
   assertThat(response.statusCode()).as(path).isIn(401,403);
  }
  var normal=http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/account")).header("Authorization","Bearer "+session.getAccessToken()).build(),HttpResponse.BodyHandlers.discarding());
  assertThat(normal.statusCode()).isEqualTo(200);
 }
}
