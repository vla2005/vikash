package com.vikash_api.integrations.fuellog;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

/** Same financial scenarios, using the production database engine with synthetic data only. */
@EnabledIfEnvironmentVariable(named="VIKASH_FUELLOG_POSTGRES_TEST",matches="true")
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@DataJpaTest(showSql=false,properties={
 "integrations.fuellog.enabled=true", "spring.config.import=", "spring.jpa.show-sql=false",
 "spring.datasource.url=${FUELLOG_TEST_DB_URL}", "spring.datasource.username=fuellog_test",
 "spring.datasource.password=isolated-test-only", "spring.datasource.driver-class-name=org.postgresql.Driver",
 "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect", "spring.jpa.hibernate.ddl-auto=create-drop"
})
class FuelLogFinancialPostgresTest extends FuelLogFinancialServiceTest {
 static {
  if(!java.util.Objects.toString(System.getenv("FUELLOG_TEST_DB_URL"),"").matches("jdbc:postgresql://(?:localhost|127\\.0\\.0\\.1):[0-9]+/fuellog_integration_test"))
   throw new IllegalStateException("FuelLog PostgreSQL tests require an isolated loopback database named fuellog_integration_test.");
 }
}
