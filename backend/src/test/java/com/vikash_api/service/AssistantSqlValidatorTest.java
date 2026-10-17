package com.vikash_api.service;

import com.vikash_api.assistant.*;
import com.vikash_api.exceptions.AssistantSqlRejectedException;
import java.util.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.*;

class AssistantSqlValidatorTest {
    FinancialCatalog catalog; AssistantSqlValidator validator;
    @BeforeEach void setup() throws Exception { catalog=new FinancialCatalog(JsonMapper.builder().build());validator=new AssistantSqlValidator(catalog); }
    FinancialPlan plan(String sql) { return plan(sql,List.of(),List.of("assistant_finance.transactions")); }
    FinancialPlan plan(String sql,List<FinancialPlan.Parameter> params,List<String> views) {
        return new FinancialPlan(catalog.version(),FinancialPlan.Decision.query,"Teste fictício",sql,params,views,null);
    }
    static Stream<String> validQueries() { return Stream.of(
        "SELECT COALESCE(SUM(amount),0) AS total FROM assistant_finance.transactions WHERE type='EXPENSE'",
        "SELECT category_name, SUM(amount) AS total FROM assistant_finance.transactions GROUP BY category_name ORDER BY total DESC LIMIT 10",
        "SELECT description, amount FROM assistant_finance.transactions WHERE amount > 100 AND payment_method = 'PIX' ORDER BY occurred_at DESC LIMIT 100",
        "SELECT COUNT(*) AS quantidade FROM assistant_finance.transactions WHERE category_name IS NULL",
        "SELECT TRIM(description), LOWER(category_name), LENGTH(description), TO_CHAR(occurred_at,'YYYY-MM') AS mes FROM assistant_finance.transactions",
        "SELECT MIN(amount), MAX(amount), AVG(amount), ABS(SUM(amount)) FROM assistant_finance.transactions",
        "SELECT COUNT(DISTINCT category_name) AS quantidade FROM assistant_finance.transactions",
        "SELECT SUM(CASE WHEN type='EXPENSE' THEN amount ELSE 0 END) AS total FROM assistant_finance.transactions",
        "SELECT ROUND(SUM(amount)/NULLIF(COUNT(*),0),2) AS media FROM assistant_finance.transactions",
        "SELECT amount FROM assistant_finance.transactions WHERE EXTRACT(ISODOW FROM occurred_at) IN (6,7)",
        "SELECT description FROM assistant_finance.transactions WHERE description ILIKE '%mercado%'",
        "SELECT amount FROM assistant_finance.transactions WHERE amount BETWEEN 10 AND 30",
        "SELECT amount FROM assistant_finance.transactions WHERE NOT (amount < 10)",
        "SELECT amount FROM assistant_finance.transactions WHERE amount != 30;",
        "SELECT DATE_TRUNC('month', occurred_at) AS mes, SUM(amount) AS total FROM assistant_finance.transactions GROUP BY DATE_TRUNC('month', occurred_at)",
        "SELECT DATE_TRUNC('month', occurred_at) AS mes, SUM(amount) AS total FROM assistant_finance.transactions GROUP BY mes",
        "WITH totals AS (SELECT category_name, SUM(amount) AS total FROM assistant_finance.transactions GROUP BY category_name) SELECT category_name,total FROM totals WHERE total>100",
        "SELECT x.total FROM (SELECT SUM(amount) AS total FROM assistant_finance.transactions) x",
        "SELECT amount FROM assistant_finance.transactions WHERE amount>100 UNION ALL SELECT amount FROM assistant_finance.transactions WHERE amount<10",
        "SELECT amount FROM assistant_finance.transactions WHERE description='O''Brien; -- texto'"
    ); }
    @ParameterizedTest @MethodSource("validQueries") void acceptsAndRebuildsSupportedFinancialSelects(String sql) {
        var result=validator.validate(plan(sql));
        assertThat(result.sql()).contains("LIMIT").doesNotContain(";", "--");
        assertThat(result.sql()).contains("\"assistant_finance\".\"transactions\"");
        assertThat(result.matches(plan(sql))).isTrue();
        assertThat(result.fingerprint()).hasSize(64);
    }
    static Stream<String> attacks() { return Stream.of(
        "DELETE FROM assistant_finance.transactions", "UPDATE assistant_finance.transactions SET amount=0", "INSERT INTO assistant_finance.transactions(amount) VALUES(1)",
        "DROP TABLE users", "TRUNCATE users", "CALL pg_catalog.pg_sleep(10)", "COPY users TO '/tmp/data'", "EXPLAIN SELECT amount FROM assistant_finance.transactions",
        "SELECT amount FROM assistant_finance.transactions; DELETE FROM users", "SELECT amount FROM assistant_finance.transactions; SELECT 1",
        "SELECT * FROM assistant_finance.transactions", "SELECT t.* FROM assistant_finance.transactions t", "SELECT user_id FROM assistant_finance.transactions",
        "SELECT password FROM public.users", "SELECT relname FROM pg_catalog.pg_class", "SELECT table_name FROM information_schema.tables",
        "SELECT amount FROM transactions", "SELECT amount FROM public.transactions", "SELECT amount FROM other.assistant_finance.transactions",
        "SELECT amount INTO temp stolen FROM assistant_finance.transactions", "SELECT amount FROM assistant_finance.transactions INTO OUTFILE '/tmp/a'",
        "SELECT amount FROM assistant_finance.transactions FOR UPDATE", "SELECT amount FROM assistant_finance.transactions FOR SHARE NOWAIT",
        "SELECT pg_sleep(5) FROM assistant_finance.transactions", "SELECT TRIM(pg_read_file('/etc/passwd')) FROM assistant_finance.transactions", "SELECT pg_catalog.pg_read_file('/etc/passwd') FROM assistant_finance.transactions",
        "SELECT current_setting('app.assistant_user_id') FROM assistant_finance.transactions", "SELECT set_config('app.assistant_user_id','2',true) FROM assistant_finance.transactions",
        "SELECT pg_advisory_lock(1) FROM assistant_finance.transactions", "SELECT nextval('secret') FROM assistant_finance.transactions",
        "SELECT public.sum(amount) FROM assistant_finance.transactions", "SELECT pg_temp.sum(amount) FROM assistant_finance.transactions",
        "SELECT dblink('secret','select 1') FROM assistant_finance.transactions", "SELECT lo_import('/etc/passwd') FROM assistant_finance.transactions",
        "SELECT amount FROM generate_series(1,1000000000) t", "SELECT amount FROM assistant_finance.transactions CROSS JOIN assistant_finance.accounts",
        "SELECT t.amount FROM assistant_finance.transactions t JOIN assistant_finance.accounts a ON 1=1",
        "SELECT t.amount FROM assistant_finance.transactions t, assistant_finance.transactions x",
        "SELECT amount FROM assistant_finance.transactions WHERE EXISTS(SELECT password FROM users)",
        "SELECT amount FROM assistant_finance.transactions UNION ALL SELECT password FROM users",
        "WITH x AS (DELETE FROM users RETURNING id) SELECT amount FROM assistant_finance.transactions",
        "WITH RECURSIVE x AS (SELECT amount FROM assistant_finance.transactions) SELECT amount FROM x",
        "WITH unused AS (SELECT password FROM users) SELECT amount FROM assistant_finance.transactions",
        "WITH transactions AS (SELECT amount FROM assistant_finance.transactions) SELECT amount FROM transactions",
        "SELECT amount FROM assistant_finance.transactions ORDER BY pg_sleep(3)",
        "SELECT amount FROM assistant_finance.transactions WHERE description SIMILAR TO '(a+)+$'",
        "SELECT amount FROM assistant_finance.transactions WHERE description ~ '(a+)+$'",
        "SELECT CAST(description AS public.secret_type) FROM assistant_finance.transactions",
        "SELECT CAST(description AS regclass) FROM assistant_finance.transactions",
        "SELECT sum(amount) FILTER (WHERE pg_sleep(1) IS NULL) FROM assistant_finance.transactions",
        "SELECT SUM(amount) OVER () FROM assistant_finance.transactions",
        "SELECT amount FROM assistant_finance.transactions LIMIT 101", "SELECT amount FROM assistant_finance.transactions LIMIT ALL",
        "SELECT amount FROM assistant_finance.transactions LIMIT :limite", "SELECT amount FROM assistant_finance.transactions OFFSET 1000000",
        "SELECT amount FROM assistant_finance.transactions ORDER BY 1", "SELECT amount FROM assistant_finance.transactions TABLESAMPLE SYSTEM(10)",
        "SELECT amount FROM assistant_finance.transactions -- comment", "SELECT /* hidden */ amount FROM assistant_finance.transactions",
        "SELECT amount FROM \"assistant_finance\".\"transactions\"", "SELECT amount FROM assistant_finance.transactions WHERE description=E'back\\slash'",
        "SELECT amount FROM assistant_finance.transactions WHERE amount=$1", "SELECT amount FROM assistant_finance.transactions WHERE amount=?",
        "SELECT amount FROM assistant_finance.transactions WHERE description=$$payload$$",
        "SELECT amount FROM assistant_finance.transactions t(a)", "SELECT * FROM (SELECT amount FROM assistant_finance.transactions) x",
        "SELECT 1", "SELECT amount FROM assistant_finance.transactions SETTINGS max_threads=100"
    ); }
    @ParameterizedTest @MethodSource("attacks") void rejectsUnsafeOrUnsupportedQueriesWithoutTouchingDatabase(String sql) {
        assertThatThrownBy(()->validator.validate(plan(sql))).isInstanceOf(AssistantSqlRejectedException.class).hasMessageNotContaining(sql);
    }
    @Test void bindsTypedInputsAndAllLiteralsInsteadOfInterpolatingThem() {
        var parameters=List.of(new FinancialPlan.Parameter("inicio","date","2026-10-01"),new FinancialPlan.Parameter("nome","text","x'; DELETE FROM users; --"));
        var result=validator.validate(plan("SELECT SUM(amount) FROM assistant_finance.transactions WHERE occurred_at>=CAST(:inicio AS timestamp) AND description=:nome AND type='EXPENSE'",parameters,List.of("assistant_finance.transactions")));
        assertThat(result.sql()).contains(":inicio",":nome","pg_catalog.timestamp").doesNotContain("DELETE", "EXPENSE");
        assertThat(result.bindings().get("nome").value()).isEqualTo(parameters.get(1).value());
        assertThat(result.bindings().get("inicio").value()).isEqualTo(java.time.LocalDate.of(2026,10,1));
        assertThat(result.bindings().values()).anyMatch(v->v.value().equals("EXPENSE"));
    }
    @Test void checksColumnsOnEveryViewAndJoinScope() {
        var result=validator.validate(plan("SELECT t.amount, a.account_name FROM assistant_finance.transactions t JOIN assistant_finance.accounts a ON t.account_uuid=a.account_uuid",List.of(),List.of("assistant_finance.transactions","assistant_finance.accounts")));
        assertThat(result.sql()).contains("INNER JOIN");
        assertThatThrownBy(()->validator.validate(plan("SELECT a.amount FROM assistant_finance.transactions t JOIN assistant_finance.accounts a ON t.account_uuid=a.account_uuid",List.of(),List.of("assistant_finance.transactions","assistant_finance.accounts")))).isInstanceOf(AssistantSqlRejectedException.class);
    }
    @Test void rejectsViewsDeclarationMismatchAndUnknownOrUnusedParameters() {
        assertThatThrownBy(()->validator.validate(plan("SELECT amount FROM assistant_finance.transactions",List.of(),List.of("assistant_finance.accounts")))).isInstanceOf(AssistantSqlRejectedException.class);
        assertThatThrownBy(()->validator.validate(plan("SELECT amount FROM assistant_finance.transactions WHERE amount>:valor"))).isInstanceOf(AssistantSqlRejectedException.class);
        assertThatThrownBy(()->validator.validate(plan("SELECT amount FROM assistant_finance.transactions",List.of(new FinancialPlan.Parameter("extra","text","x")),List.of("assistant_finance.transactions")))).isInstanceOf(AssistantSqlRejectedException.class);
    }
    @Test void boundsSizeNestingAndBranchExplosion() {
        for (String sql:List.of("SELECT "+"(".repeat(30)+"amount"+")".repeat(30)+" FROM assistant_finance.transactions", "SELECT amount FROM assistant_finance.transactions WHERE "+"amount=1 OR ".repeat(500)+"amount=1", "x".repeat(16001)))
            assertThatThrownBy(()->validator.validate(plan(sql))).isInstanceOf(AssistantSqlRejectedException.class);
    }
    @Test void validatesParameterTypesEvenWithoutGeminiParser() {
        for (var parameter:List.of(new FinancialPlan.Parameter("a","date","2026-02-30"),new FinancialPlan.Parameter("user_id","integer","1"),new FinancialPlan.Parameter("a","decimal","1e10000"),new FinancialPlan.Parameter("a","text","x".repeat(241))))
            assertThatThrownBy(()->validator.validate(plan("SELECT amount FROM assistant_finance.transactions WHERE amount=:a",List.of(parameter),List.of("assistant_finance.transactions")))).isInstanceOf(AssistantSqlRejectedException.class);
    }
    @Test void acceptsBooleanColumnsAndDoesNotTrustCachedPlanChanges() {
        var p=plan("SELECT balance FROM assistant_finance.accounts WHERE active=true",List.of(),List.of("assistant_finance.accounts"));
        var result=validator.validate(p);assertThat(result.sql()).contains("TRUE");
        assertThat(result.matches(plan("SELECT amount FROM assistant_finance.transactions"))).isFalse();
    }
    @Test void doesNotTruncateInputsOfNestedAggregations() {
        var result=validator.validate(plan("WITH raw AS (SELECT amount FROM assistant_finance.transactions) SELECT SUM(amount) FROM raw"));
        assertThat(result.sql().split("LIMIT",-1)).hasSize(2);
        assertThat(result.sql()).endsWith("LIMIT 100");
    }
    @Test void rejectsFanOutJoinsEvenWhenColumnNamesMatch() {
        assertThatThrownBy(()->validator.validate(plan("SELECT p.amount FROM assistant_finance.purchases p JOIN assistant_finance.invoices i ON p.card_uuid=i.card_uuid",List.of(),List.of("assistant_finance.purchases","assistant_finance.invoices")))).isInstanceOf(AssistantSqlRejectedException.class);
    }

    static Stream<String> hiddenFunctionAttacks() {
        var functions=List.of("pg_sleep(3)","pg_read_file('/etc/passwd')","set_config('app.assistant_user_id','2',true)",
            "nextval('private_sequence')","dblink('connection','SELECT password FROM users')","public.sum(amount)","pg_advisory_lock(1)");
        return functions.stream().flatMap(function->Stream.of(
            "SELECT "+function+" FROM assistant_finance.transactions",
            "SELECT amount FROM assistant_finance.transactions WHERE "+function+" IS NULL",
            "SELECT SUM(amount) FROM assistant_finance.transactions HAVING "+function+" IS NULL",
            "SELECT amount FROM assistant_finance.transactions ORDER BY "+function,
            "SELECT "+function+" FROM assistant_finance.transactions GROUP BY category_name",
            "WITH hidden AS (SELECT "+function+" AS hidden FROM assistant_finance.transactions) SELECT amount FROM assistant_finance.transactions",
            "SELECT amount FROM assistant_finance.transactions UNION ALL SELECT "+function+" FROM assistant_finance.transactions"
        ));
    }
    @ParameterizedTest @MethodSource("hiddenFunctionAttacks") void findsForbiddenFunctionsInEverySupportedBranch(String sql) {
        assertThatThrownBy(()->validator.validate(plan(sql))).isInstanceOf(AssistantSqlRejectedException.class);
    }

}
