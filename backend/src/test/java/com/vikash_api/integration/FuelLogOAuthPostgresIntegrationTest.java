package com.vikash_api.integration;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;

/** Repeats the real HTTP contract against an explicitly isolated PostgreSQL database. */
@EnabledIfEnvironmentVariable(named="VIKASH_FUELLOG_POSTGRES_TEST",matches="true")
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
 "integrations.fuellog.enabled=true",
 "integrations.fuellog.web-return-uri=http://127.0.0.1:9192/vikash-return",
 "integrations.fuellog.native-return-uri=fuellog://vikash-return", "integrations.fuellog.issuer=http://127.0.0.1:8080",
 "integrations.fuellog.client-secret-hash={noop}local-test-only-secret",
 "integrations.fuellog.redirect-uri=http://127.0.0.1:9191/callback", "security.login.origin-limit=1000",
 "spring.datasource.url=${FUELLOG_TEST_DB_URL}", "spring.datasource.username=fuellog_test",
 "spring.datasource.password=isolated-test-only", "spring.datasource.driver-class-name=org.postgresql.Driver",
 "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect", "spring.jpa.hibernate.ddl-auto=create-drop"
})
class FuelLogOAuthPostgresIntegrationTest extends FuelLogOAuthIntegrationTest {
 static {
  if(!java.util.Objects.toString(System.getenv("FUELLOG_TEST_DB_URL"),"").matches("jdbc:postgresql://(?:localhost|127\\.0\\.0\\.1):[0-9]+/fuellog_integration_test"))
   throw new IllegalStateException("FuelLog PostgreSQL tests require an isolated loopback database named fuellog_integration_test.");
 }
}
