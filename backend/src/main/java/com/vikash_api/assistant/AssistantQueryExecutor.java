package com.vikash_api.assistant;

import com.vikash_api.exceptions.AssistantQueryException;
import com.vikash_api.exceptions.AssistantSqlRejectedException;
import com.vikash_api.logging.SafeDiagnostics;
import com.vikash_api.services.AuthenticatedUserService;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.annotation.PreDestroy;
import java.io.Reader;
import java.math.BigDecimal;
import java.sql.*;
import java.time.*;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Único caminho de execução: plano revalidado + identidade obtida da autenticação. */
@Slf4j @Service
public class AssistantQueryExecutor implements AutoCloseable {
    public static final String VERSION="financial-read-v1";
    private final AssistantExecutionProperties limits;
    private final AssistantSqlValidator validator;
    private final FinancialCatalog catalog;
    private final AuthenticatedUserService auth;
    private final ObjectMapper mapper;
    private HikariDataSource readerPool;
    public AssistantQueryExecutor(AssistantExecutionProperties limits, AssistantSqlValidator validator, FinancialCatalog catalog,
            AuthenticatedUserService auth,ObjectMapper mapper,@Value("${spring.datasource.username}") String primaryUsername) {
        limits.validate();
        if (limits.isEnabled() && limits.getUsername().equals(primaryUsername)) throw new IllegalArgumentException("O leitor não pode usar a credencial principal.");
        this.limits=limits;this.validator=validator;this.catalog=catalog;this.auth=auth;this.mapper=mapper;
    }
    public boolean isEnabled() { return limits.isEnabled(); }
    public static final class QueryResult {
        private final UUID ownerUuid;
        private final AssistantSqlValidator.ValidatedSql validated;
        private final Map<String,Object> snapshot;
        private QueryResult(UUID ownerUuid,AssistantSqlValidator.ValidatedSql validated,Map<String,Object> snapshot) {
            this.ownerUuid=ownerUuid;this.validated=validated;this.snapshot=Collections.unmodifiableMap(snapshot);
        }
        public boolean belongsTo(UUID owner,FinancialPlan plan,String hash) { return ownerUuid.equals(owner) && validated.matches(plan) && validated.fingerprint().equals(hash); }
        public Map<String,Object> snapshot() { return snapshot; }
    }
    private synchronized HikariDataSource pool() {
        if (readerPool==null) {
            var config=new HikariConfig();
            config.setJdbcUrl(limits.getJdbcUrl());config.setUsername(limits.getUsername());config.setPassword(limits.getPassword());
            config.setPoolName("assistant-readonly");config.setMaximumPoolSize(limits.getPoolSize());config.setMinimumIdle(0);
            config.setConnectionTimeout(limits.getAcquireTimeoutMs());config.setValidationTimeout(500);
            config.setReadOnly(true);config.setAutoCommit(true);config.setInitializationFailTimeout(-1);
            config.addDataSourceProperty("ApplicationName","vikash-assistant-reader");
            config.addDataSourceProperty("connectTimeout","2");config.addDataSourceProperty("socketTimeout","5");
            config.addDataSourceProperty("prepareThreshold","0");config.addDataSourceProperty("readOnlyMode","transaction");
            readerPool=new HikariDataSource(config);
        }
        return readerPool;
    }
    public QueryResult execute(FinancialPlan plan,AssistantSqlValidator.ValidatedSql supplied) {
        if (!isEnabled()) throw new AssistantQueryException("READER_UNAVAILABLE");
        if (TransactionSynchronizationManager.isActualTransactionActive()) throw new AssistantQueryException("ISOLATION_GUARD");
        var user=auth.getCurrentUser();
        if (!user.isActive() || user.getUuid()==null) throw new AccessDeniedException("Sessão indisponível para consulta.");
        var validated=validator.validate(plan); // Nunca executar coluna/cache sem revalidar.
        if (supplied==null || !supplied.matches(plan) || !supplied.fingerprint().equals(validated.fingerprint())) throw new AssistantSqlRejectedException("EXECUTION_PROOF");
        long started=System.nanoTime();
        log.info("event=assistant.query.start executionVersion={} policyVersion={}",VERSION,AssistantSqlValidator.POLICY_VERSION);
        try (var connection=pool().getConnection()) {
            verifyReader(connection);
            connection.setReadOnly(true);connection.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);connection.setAutoCommit(false);
            try {
                try (var statement=connection.createStatement()) { statement.execute("SET TRANSACTION READ ONLY"); }
                configure(connection,user.getUuid());
                var values=new MapSqlParameterSource();validated.bindings().forEach((name,binding)->values.addValue(name,binding.value()));
                var parsed=NamedParameterUtils.parseSqlStatement(validated.sql());
                String sql=NamedParameterUtils.substituteNamedParameters(parsed,values);
                Object[] arguments=NamedParameterUtils.buildValueArray(parsed,values,null);
                BigDecimal cost;
                try (var statement=prepare(connection,"EXPLAIN (ANALYZE FALSE, FORMAT JSON, COSTS TRUE) "+sql,arguments,limits.getPlanTimeoutMs()); var rows=statement.executeQuery()) {
                    if (!rows.next()) throw new AssistantQueryException("COST_LIMIT");
                    String json=bounded(rows.getCharacterStream(1),131072);
                    var metrics=checkPlan(mapper.readTree(json).path(0).path("Plan"),new int[]{0});cost=metrics;
                }
                setTimeout(connection,limits.getStatementTimeoutMs());
                var columns=new ArrayList<String>();var data=new ArrayList<Map<String,Object>>();
                int bytes=1024;
                try (var statement=prepare(connection,sql,arguments,limits.getStatementTimeoutMs())) {
                    statement.setMaxRows(limits.getMaxRows()+1);statement.setFetchSize(25);
                    try (var rows=statement.executeQuery()) {
                        var metadata=rows.getMetaData();
                        if (metadata.getColumnCount()>24) throw new AssistantQueryException("RESULT_LIMIT");
                        for (int i=1;i<=metadata.getColumnCount();i++) {
                            String label=metadata.getColumnLabel(i);
                            if (label==null || label.length()>63 || columns.contains(label)) throw new AssistantQueryException("RESULT_LIMIT");columns.add(label);
                        }
                        while (rows.next()) {
                            if (data.size()>=limits.getMaxRows()) throw new AssistantQueryException("RESULT_LIMIT");
                            if (SafeDiagnostics.elapsedMs(started)>limits.getTransactionTimeoutMs()+limits.getAcquireTimeoutMs()) throw new AssistantQueryException("TIME_LIMIT");
                            var row=new LinkedHashMap<String,Object>();
                            for (int i=1;i<=columns.size();i++) row.put(columns.get(i-1),cell(rows.getObject(i)));
                            bytes+=mapper.writeValueAsBytes(row).length;
                            if (bytes>limits.getMaxResultBytes()) throw new AssistantQueryException("RESULT_LIMIT");
                            data.add(Collections.unmodifiableMap(row));
                        }
                    }
                }
                var snapshot=new LinkedHashMap<String,Object>();
                snapshot.put("columns",List.copyOf(columns));snapshot.put("rows",List.copyOf(data));snapshot.put("rowCount",data.size());
                snapshot.put("estimatedCost",cost);snapshot.put("executedAt",Instant.now().toString());
                snapshot.put("durationMs",SafeDiagnostics.elapsedMs(started));snapshot.put("executionVersion",VERSION);
                if (mapper.writeValueAsBytes(snapshot).length>limits.getMaxResultBytes()) throw new AssistantQueryException("RESULT_LIMIT");
                log.info("event=assistant.query.complete rows={} columns={} estimatedCost={} durationMs={} sqlExecuted=true",data.size(),columns.size(),cost,SafeDiagnostics.elapsedMs(started));
                return new QueryResult(user.getUuid(),validated,snapshot);
            } finally {
                // Toda saída, inclusive cancelamento/erro, encerra SET LOCAL antes de devolver ao pool.
                try { connection.rollback(); } catch (SQLException failure) { pool().evictConnection(connection); }
            }
        } catch (AssistantQueryException failure) {
            log.info("event=assistant.query.rejected reason={} durationMs={}",failure.getReason(),SafeDiagnostics.elapsedMs(started));throw failure;
        } catch (SQLException failure) {
            SafeDiagnostics.failure(log,"assistant.query.failed","AssistantQueryExecutor.execute",failure,SafeDiagnostics.elapsedMs(started),false);
            String state=failure.getSQLState();
            String reason=Set.of("57014","55P03","25P03","25P04","57P05").contains(state==null?"":state)?"TIME_LIMIT":failure instanceof SQLTransientConnectionException || state!=null && (state.startsWith("08") || state.startsWith("28"))?"READER_UNAVAILABLE":"QUERY_FAILED";
            throw new AssistantQueryException(reason,failure);
        } catch (RuntimeException failure) {
            SafeDiagnostics.failure(log,"assistant.query.failed","AssistantQueryExecutor.execute",failure,SafeDiagnostics.elapsedMs(started),false);
            throw new AssistantQueryException("READER_UNAVAILABLE",failure);
        }
    }
    private PreparedStatement prepare(Connection connection,String sql,Object[] values,int timeout) throws SQLException {
        var statement=connection.prepareStatement(sql);
        try {
            statement.setQueryTimeout(Math.max(1,(timeout+999)/1000));
            for (int i=0;i<values.length;i++) statement.setObject(i+1,values[i]);
            return statement;
        } catch (SQLException | RuntimeException failure) { statement.close();throw failure; }
    }
    private void configure(Connection connection,UUID user) throws SQLException {
        String sql="SELECT set_config('app.assistant_user_uuid',?,true),set_config('search_path','pg_catalog',true),set_config('row_security','on',true),set_config('TimeZone','America/Sao_Paulo',true),"+
            "set_config('statement_timeout',?,true),set_config('lock_timeout',?,true),set_config('transaction_timeout',?,true),"+
            "set_config('idle_in_transaction_session_timeout','3000ms',true),set_config('work_mem','2MB',true),set_config('jit','off',true),"+
            "set_config('max_parallel_workers_per_gather','0',true),set_config('plan_cache_mode','force_custom_plan',true)";
        try (var statement=connection.prepareStatement(sql)) {
            statement.setString(1,user.toString());statement.setString(2,limits.getPlanTimeoutMs()+"ms");
            statement.setString(3,limits.getLockTimeoutMs()+"ms");statement.setString(4,limits.getTransactionTimeoutMs()+"ms");statement.execute();
        }
    }
    private void setTimeout(Connection connection,int timeout) throws SQLException {
        try (var statement=connection.prepareStatement("SELECT set_config('statement_timeout',?,true)")) { statement.setString(1,timeout+"ms");statement.execute(); }
    }
    private BigDecimal checkPlan(JsonNode node,int[] count) {
        if (!node.isObject() || ++count[0]>limits.getMaxPlanNodes() || !node.has("Total Cost") || !node.has("Plan Rows")) throw new AssistantQueryException("COST_LIMIT");
        BigDecimal cost=new BigDecimal(node.path("Total Cost").asText());
        if (cost.signum()<0 || cost.compareTo(limits.getMaxEstimatedCost())>0 || node.path("Plan Rows").asLong()>limits.getMaxEstimatedRows()) throw new AssistantQueryException("COST_LIMIT");
        for (var child:node.path("Plans")) cost=cost.max(checkPlan(child,count));
        return cost;
    }
    private Object cell(Object value) {
        if (value==null) return null;
        if (value instanceof BigDecimal number) { if (number.precision()>128 || Math.abs(number.scale())>128) throw new AssistantQueryException("RESULT_LIMIT");return number; }
        if (value instanceof Boolean || value instanceof Integer || value instanceof Long || value instanceof Short) return value;
        String text;
        if (value instanceof String s) text=s;
        else if (value instanceof UUID id) text=id.toString();
        else if (value instanceof java.sql.Date date) text=date.toLocalDate().toString();
        else if (value instanceof Timestamp timestamp) text=timestamp.toLocalDateTime().toString();
        else throw new AssistantQueryException("RESULT_LIMIT");
        if (text.length()>limits.getMaxCellChars()) throw new AssistantQueryException("RESULT_LIMIT");return text;
    }
    private String bounded(Reader reader,int limit) {
        try (reader) {
            var buffer=new StringBuilder();char[] chunk=new char[4096];int read;
            while ((read=reader.read(chunk))!=-1) { if (buffer.length()+read>limit) throw new AssistantQueryException("COST_LIMIT");buffer.append(chunk,0,read); }
            return buffer.toString();
        } catch (java.io.IOException failure) { throw new AssistantQueryException("READER_UNAVAILABLE",failure); }
    }
    private void verifyReader(Connection connection) throws SQLException {
        String roleSql="SELECT session_user,current_user,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolreplication,rolinherit,rolcanlogin,"+
            "current_setting('server_version_num')::int,current_setting('default_transaction_read_only'),"+
            "(SELECT count(*) FROM pg_catalog.pg_auth_members WHERE member=role.oid) FROM pg_catalog.pg_roles role WHERE rolname=current_user";
        try (var statement=connection.createStatement();var rows=statement.executeQuery(roleSql)) {
            if (!rows.next() || !limits.getUsername().equals(rows.getString(1)) || !limits.getUsername().equals(rows.getString(2))) throw new AssistantQueryException("ISOLATION_GUARD");
            for (int i=3;i<=8;i++) if (rows.getBoolean(i)) throw new AssistantQueryException("ISOLATION_GUARD");
            if (!rows.getBoolean(9) || rows.getInt(10)<180000 || !rows.getString(11).equals("on") || rows.getInt(12)!=0) throw new AssistantQueryException("ISOLATION_GUARD");
        }
        String privileges="SELECT n.nspname,c.relname,c.relkind,c.reloptions,r.rolname,"+
            "has_table_privilege(current_user,c.oid,'SELECT') OR has_any_column_privilege(current_user,c.oid,'SELECT'),"+
            "has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(current_user,c.oid,'INSERT,UPDATE,REFERENCES') "+
            "FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_roles r ON r.oid=c.relowner "+
            "WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND c.relkind IN ('r','p','v','m','f')";
        var readable=new HashSet<String>();
        try (var statement=connection.createStatement();var rows=statement.executeQuery(privileges)) {
            while (rows.next()) {
                String name=rows.getString(1)+"."+rows.getString(2);
                if (rows.getBoolean(7)) throw new AssistantQueryException("ISOLATION_GUARD");
                if (rows.getBoolean(6)) {
                    if (!catalog.viewNames().contains(name) || !rows.getString(3).equals("v") || !rows.getString(5).equals("vikash_assistant_view_owner") ||
                        rows.getArray(4)==null || !Arrays.asList((String[])rows.getArray(4).getArray()).contains("security_barrier=true")) throw new AssistantQueryException("ISOLATION_GUARD");
                    readable.add(name);
                }
            }
        }
        if (!readable.equals(catalog.viewNames())) throw new AssistantQueryException("ISOLATION_GUARD");
        String ownerSql="SELECT NOT(rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit) AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members WHERE member=owner.oid OR roleid=owner.oid) FROM pg_catalog.pg_roles owner WHERE rolname='vikash_assistant_view_owner'";
        try (var statement=connection.createStatement();var rows=statement.executeQuery(ownerSql)) {
            if (!rows.next() || !rows.getBoolean(1)) throw new AssistantQueryException("ISOLATION_GUARD");
        }
        String createSql="SELECT has_database_privilege(current_user,current_database(),'CREATE') OR EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND has_schema_privilege(current_user,n.oid,'CREATE')) OR EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' AND n.nspname NOT LIKE 'pg_%' AND has_sequence_privilege(current_user,c.oid,'USAGE,SELECT,UPDATE'))";
        try (var statement=connection.createStatement();var rows=statement.executeQuery(createSql)) { if (!rows.next() || rows.getBoolean(1)) throw new AssistantQueryException("ISOLATION_GUARD"); }
    }
    @Override @PreDestroy public synchronized void close() { if (readerPool!=null) { readerPool.close();readerPool=null; } }
}
