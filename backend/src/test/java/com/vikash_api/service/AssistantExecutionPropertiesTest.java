package com.vikash_api.service;
import com.vikash_api.assistant.AssistantExecutionProperties;
import java.math.BigDecimal;
import java.util.function.Consumer;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import static org.assertj.core.api.Assertions.*;
class AssistantExecutionPropertiesTest {
    @Test void disabledByDefaultAndDoesNotRequireMainCredentialFallback() {
        var properties=new AssistantExecutionProperties();
        assertThat(properties.isEnabled()).isFalse();properties.validate();
        assertThat(properties.getUsername()).isEqualTo("vikash_assistant_reader");
        assertThat(properties.getPassword()).isEmpty();
    }
    static Stream<Consumer<AssistantExecutionProperties>> unsafe() { return Stream.of(
        p->p.setPoolSize(5),p->p.setAcquireTimeoutMs(3001),p->p.setStatementTimeoutMs(5001),
        p->p.setPlanTimeoutMs(2001),p->p.setTransactionTimeoutMs(10001),p->p.setTransactionTimeoutMs(500),
        p->p.setMaxEstimatedCost(BigDecimal.ZERO),p->p.setMaxEstimatedRows(0),p->p.setMaxPlanNodes(301),
        p->p.setMaxRows(101),p->p.setMaxResultBytes(65537),p->p.setMaxCellChars(4097),
        p->p.setUsername("postgres"),p->p.setPassword("short"),p->p.setJdbcUrl("jdbc:h2:mem:invalid"),
        p->p.setJdbcUrl(null),p->p.setUsername(null),p->p.setJdbcUrl("jdbc:postgresql://host/db?password=secret"),
        p->p.setJdbcUrl("jdbc:postgresql://host/db?Options=-csearch_path=public"),p->p.setJdbcUrl("jdbc:postgresql://user:secret@host/db")); }
    @ParameterizedTest @MethodSource("unsafe") void rejectsUnsafeConfiguration(Consumer<AssistantExecutionProperties> change) {
        var p=new AssistantExecutionProperties();p.setEnabled(true);p.setJdbcUrl("jdbc:postgresql://host/db");p.setPassword("fictional-test-password-long-enough");
        change.accept(p);assertThatThrownBy(p::validate).isInstanceOf(IllegalArgumentException.class);
    }
}
