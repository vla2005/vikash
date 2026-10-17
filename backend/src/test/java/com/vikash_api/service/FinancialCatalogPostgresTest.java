package com.vikash_api.service;

import com.vikash_api.assistant.FinancialCatalog;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "VIKASH_ASSISTANT_POSTGRES_TEST", matches = "true")
@SpringBootTest(properties = {
    "spring.datasource.url=${ASSISTANT_TEST_DB_URL}", "spring.datasource.username=assistant_test",
    "spring.datasource.password=${ASSISTANT_TEST_DB_PASSWORD}", "spring.datasource.driver-class-name=org.postgresql.Driver",
    "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect", "spring.jpa.hibernate.ddl-auto=create-drop",
    "assistant.planning.enabled=false"})
class FinancialCatalogPostgresTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager manager;
    @Autowired FinancialCatalog catalog;
    @Autowired ObjectMapper mapper;
    @Test void realPostgresMatchesCatalogAndViewsIsolateUsersWithoutDoubleCounting() throws Exception {
        assertThat(System.getenv("ASSISTANT_TEST_DB_URL")).contains("/assistant_catalog_test");
        try (var connection = Objects.requireNonNull(jdbc.getDataSource()).getConnection()) {
            var migration = Path.of(System.getProperty("basedir"), "migrations", "2026-10-16-assistant-financial-views.sql");
            ScriptUtils.executeSqlScript(connection, new FileSystemResource(migration));
            ScriptUtils.executeSqlScript(connection, new FileSystemResource(migration)); // idempotente
        }
        var definition = mapper.readTree(catalog.json());
        for (var view : definition.path("views")) {
            String name = view.path("name").asText();
            try (var connection = jdbc.getDataSource().getConnection(); var result = connection.createStatement().executeQuery("SELECT * FROM " + name + " LIMIT 0")) {
                var metadata = result.getMetaData(); var columns = new LinkedHashSet<String>();
                for (int i = 1; i <= metadata.getColumnCount(); i++) columns.add(metadata.getColumnName(i));
                assertThat(columns).containsExactlyInAnyOrderElementsOf(view.path("columns").propertyNames());
                assertThat(columns).doesNotContain("user_id", "transcription", "password", "email");
            }
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM " + name, Integer.class)).isZero();
        }
        // PREPARE/describe sem EXECUTE: confere a gramática/tipos reais do PostgreSQL.
        var validator = new com.vikash_api.assistant.AssistantSqlValidator(catalog);
        for (String sql : List.of(
                "SELECT TRIM(description), LOWER(category_name), LENGTH(description), TO_CHAR(occurred_at,'YYYY-MM') AS mes FROM assistant_finance.transactions",
                "SELECT ROUND(SUM(amount)/NULLIF(COUNT(*),0),2) AS media FROM assistant_finance.transactions",
                "SELECT COALESCE(SUM(amount),0) FROM assistant_finance.transactions WHERE occurred_at>=CAST(:inicio AS timestamp) AND type='EXPENSE'",
                "SELECT EXTRACT(ISODOW FROM occurred_at), amount FROM assistant_finance.transactions WHERE description ILIKE '%mercado%'",
                "WITH raw AS (SELECT amount FROM assistant_finance.transactions) SELECT SUM(amount) FROM raw",
                "SELECT COUNT(*) FROM assistant_finance.transactions WHERE amount>100 UNION ALL SELECT COUNT(*) FROM assistant_finance.transactions WHERE amount<10")) {
            var params = sql.contains(":inicio") ? List.of(new com.vikash_api.assistant.FinancialPlan.Parameter("inicio","date","2026-10-01")) : List.<com.vikash_api.assistant.FinancialPlan.Parameter>of();
            var plan = new com.vikash_api.assistant.FinancialPlan(catalog.version(), com.vikash_api.assistant.FinancialPlan.Decision.query,
                    "Teste fictício",sql,params,List.of("assistant_finance.transactions"),null);
            var validated = validator.validate(plan);
            var values = new org.springframework.jdbc.core.namedparam.MapSqlParameterSource();
            validated.bindings().forEach((name,binding)->values.addValue(name,binding.value()));
            var parsed = org.springframework.jdbc.core.namedparam.NamedParameterUtils.parseSqlStatement(validated.sql());
            String jdbcSql = org.springframework.jdbc.core.namedparam.NamedParameterUtils.substituteNamedParameters(parsed,values);
            Object[] arguments = org.springframework.jdbc.core.namedparam.NamedParameterUtils.buildValueArray(parsed,values,null);
            try (var connection = jdbc.getDataSource().getConnection(); var statement = connection.prepareStatement(jdbcSql)) {
                connection.setReadOnly(true);
                for (int i=0;i<arguments.length;i++) statement.setObject(i+1, arguments[i]);
                assertThat(statement.getMetaData()).isNotNull();
            }
        }
        var tx = new TransactionTemplate(manager);
        tx.executeWithoutResult(status -> {
            long one = user("one"); long two = user("two");
            long institution = jdbc.queryForObject("INSERT INTO financial_institutions(name,logo_url) VALUES ('Banco fictício','test-logo') RETURNING id", Long.class);
            long a = account(one, institution, "Conta própria", 100);
            account(two, institution, "Conta de outro usuário", 900);
            for (var kind : List.of("EXPENSE", "INVOICE_PAYMENT", "TRANSFER"))
                jdbc.update("INSERT INTO transactions(uuid,user_id,account_id,description,amount,type,payment_method,occurred_at,transcription,created_at,updated_at) VALUES (?,?,?,?,10,?,'PIX',CURRENT_TIMESTAMP,'fictício',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", UUID.randomUUID(),one,a,"Teste",kind);
            long card = card(one, institution); long other = card(two, institution);
            long inv = invoice(card, 5); long otherInv = invoice(other, 700);
            long purchase = purchase(card, 50); long otherPurchase = purchase(other, 800);
            jdbc.update("INSERT INTO credit_card_installments(uuid,purchase_id,credit_card_invoice_id,installment_number,amount) VALUES (?,?,?,1,30),(?,?,?,2,20),(?,?,?,1,800)",
                UUID.randomUUID(),purchase,inv,UUID.randomUUID(),purchase,inv,UUID.randomUUID(),otherPurchase,otherInv);
            jdbc.queryForObject("SELECT set_config('app.assistant_user_uuid', ?, true)", String.class, jdbc.queryForObject("SELECT uuid::text FROM users WHERE id=?",String.class,one));
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM assistant_finance.accounts", Integer.class)).isEqualTo(1);
            assertThat(jdbc.queryForObject("SELECT SUM(balance) FROM assistant_finance.accounts", Integer.class)).isEqualTo(100);
            assertThat(jdbc.queryForObject("SELECT SUM(amount) FROM assistant_finance.transactions WHERE is_consumption", Integer.class)).isEqualTo(10);
            assertThat(jdbc.queryForObject("SELECT SUM(amount) FROM assistant_finance.transactions WHERE is_cash_outflow", Integer.class)).isEqualTo(20);
            assertThat(jdbc.queryForObject("SELECT SUM(amount) FROM assistant_finance.purchases", Integer.class)).isEqualTo(50);
            assertThat(jdbc.queryForObject("SELECT total_amount FROM assistant_finance.invoices", Integer.class)).isEqualTo(55);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM assistant_finance.installments", Integer.class)).isEqualTo(2);
            jdbc.queryForObject("SELECT set_config('app.assistant_user_uuid', ?, true)", String.class, jdbc.queryForObject("SELECT uuid::text FROM users WHERE id=?",String.class,two));
            assertThat(jdbc.queryForObject("SELECT SUM(balance) FROM assistant_finance.accounts", Integer.class)).isEqualTo(900);
            assertThat(jdbc.queryForObject("SELECT total_amount FROM assistant_finance.invoices", Integer.class)).isEqualTo(1500);
            status.setRollbackOnly();
        });
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM assistant_finance.accounts", Integer.class)).isZero();
    }
    long user(String suffix) { return jdbc.queryForObject("INSERT INTO users(uuid,name,email,password,role,active,created_at,updated_at) VALUES (?,'Fictício',?,'fake','ROLE_USER',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id", Long.class,UUID.randomUUID(),suffix+"@catalog.test"); }
    long account(long user, long institution, String name, int balance) { return jdbc.queryForObject("INSERT INTO accounts(uuid,user_id,financial_institution_id,description,type,balance,active,created_at,updated_at) VALUES (?,?,?,?,'CONTA_CORRENTE',?,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,UUID.randomUUID(),user,institution,name,balance); }
    long card(long user, long institution) { return jdbc.queryForObject("INSERT INTO credit_cards(uuid,user_id,financial_institution_id,last_four_digits,credit_limit,unallocated_used_limit,closing_day,due_day,active,created_at,updated_at) VALUES (?,?,?,1234,1000,0,1,10,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,UUID.randomUUID(),user,institution); }
    long invoice(long card, int initial) { return jdbc.queryForObject("INSERT INTO credit_card_invoices(uuid,credit_card_id,reference_month,initial_amount,closing_date,due_date,status,created_at,updated_at) VALUES (?,?,'2026-11',?,'2026-11-01','2026-11-10','OPEN',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,UUID.randomUUID(),card,initial); }
    long purchase(long card, int amount) { return jdbc.queryForObject("INSERT INTO credit_card_purchases(uuid,credit_card_id,description,amount,installment_count,occurred_at,transcription,created_at,updated_at) VALUES (?,?,'Fictício',?,2,CURRENT_TIMESTAMP,'fictício',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,UUID.randomUUID(),card,amount); }
}
