package com.vikash_api.service;
import java.nio.file.*;
import java.sql.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
final class AssistantAnswerPostgresFixture {
    final JdbcTemplate jdbc;
    AssistantAnswerPostgresFixture(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    void provision() throws Exception {
        if(!System.getenv("ASSISTANT_TEST_DB_URL").endsWith("/assistant_catalog_test"))throw new IllegalStateException("Disposable database required");
        try(var c=jdbc.getDataSource().getConnection();var statement=c.createStatement()) {
            for(String name:List.of("2026-10-16-assistant-financial-views.sql","2026-10-16-assistant-reader-permissions.sql","2026-10-16-assistant-query-results.sql","2026-10-16-assistant-answers.sql","2026-10-17-assistant-memory.sql","2026-10-17-assistant-presentation.sql"))
                statement.execute(Files.readString(Path.of(System.getProperty("basedir"),"migrations",name)));
            String password=System.getenv("ASSISTANT_READER_TEST_PASSWORD");
            if(!password.matches("[A-Za-z0-9_-]{30,100}"))throw new IllegalStateException("Test credential format");
            statement.execute("ALTER ROLE vikash_assistant_reader LOGIN PASSWORD '"+password+"'");
        }
    }
    long account(long user,String balance) {
        return jdbc.queryForObject("INSERT INTO accounts(uuid,user_id,description,type,balance,active,created_at,updated_at) VALUES (?,?,'Carteira fictícia','CARTEIRA',?,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,UUID.randomUUID(),user,new BigDecimal(balance));
    }
    long category(long user,String name) {
        return jdbc.queryForObject("INSERT INTO custom_categories(uuid,user_id,name,icon,color) VALUES (?,?,?,'tag','#ffffff') RETURNING id",Long.class,UUID.randomUUID(),user,name);
    }
    void expense(long user,long account,long category,String description,String amount,int monthOffset,String type) {
        jdbc.update("INSERT INTO transactions(uuid,user_id,account_id,custom_category_id,description,amount,type,payment_method,occurred_at,transcription,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'PIX',date_trunc('month',CURRENT_TIMESTAMP)+interval '5 days'+(? * interval '1 month'),'fictício',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",UUID.randomUUID(),user,account,category,description,new BigDecimal(amount),type,monthOffset);
    }
}
