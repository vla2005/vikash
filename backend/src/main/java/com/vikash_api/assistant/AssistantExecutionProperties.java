package com.vikash_api.assistant;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
/** Sem toString: contém a credencial exclusiva do leitor. */
@Getter @Setter @Component @ConfigurationProperties("assistant.execution")
public class AssistantExecutionProperties {
    private boolean enabled;
    private String jdbcUrl = "";
    private String username = "vikash_assistant_reader";
    private String password = "";
    private int poolSize = 4;
    private long acquireTimeoutMs = 1000;
    private int planTimeoutMs = 1000;
    private int statementTimeoutMs = 2000;
    private int lockTimeoutMs = 250;
    private int transactionTimeoutMs = 5000;
    private BigDecimal maxEstimatedCost = new BigDecimal("100000");
    private long maxEstimatedRows = 1000000;
    private int maxPlanNodes = 200;
    private int maxRows = 100;
    private int maxResultBytes = 65536;
    private int maxCellChars = 4096;
    public void validate() {
        if (poolSize<1 || poolSize>4 || acquireTimeoutMs<250 || acquireTimeoutMs>3000 || planTimeoutMs<50 || planTimeoutMs>2000 ||
            statementTimeoutMs<50 || statementTimeoutMs>5000 || lockTimeoutMs<10 || lockTimeoutMs>1000 ||
            transactionTimeoutMs<statementTimeoutMs || transactionTimeoutMs>10000 || maxEstimatedCost==null ||
            maxEstimatedCost.signum()<=0 || maxEstimatedCost.compareTo(new BigDecimal("1000000"))>0 || maxEstimatedRows<1 ||
            maxEstimatedRows>10000000 || maxPlanNodes<1 || maxPlanNodes>300 || maxRows<1 || maxRows>100 ||
            maxResultBytes<128 || maxResultBytes>65536 || maxCellChars<1 || maxCellChars>4096)
            throw new IllegalArgumentException("Limites inválidos para a consulta financeira isolada.");
        if (enabled && (jdbcUrl==null || !jdbcUrl.startsWith("jdbc:postgresql://") || !"vikash_assistant_reader".equals(username) ||
            password==null || password.length()<24 || jdbcUrl.toLowerCase(java.util.Locale.ROOT).matches(".*[?&](user|password|options)=.*") || jdbcUrl.matches(".*://[^/]*@.*")))
            throw new IllegalArgumentException("Configure uma conexão PostgreSQL exclusiva para o leitor financeiro.");
    }
}
