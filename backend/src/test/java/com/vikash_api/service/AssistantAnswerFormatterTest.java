package com.vikash_api.service;
import com.vikash_api.assistant.*;
import com.vikash_api.exceptions.AssistantAnswerException;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.*;
class AssistantAnswerFormatterTest {
    final JsonMapper mapper=JsonMapper.builder().build();
    final AssistantAnswerFormatter formatter=new AssistantAnswerFormatter(mapper);
    FinancialAnswerInput input() {
        var plan=new FinancialPlan("test",FinancialPlan.Decision.query,"Gastos consultados","SELECT amount FROM assistant_finance.transactions WHERE occurred_at>=CAST(:inicio AS timestamp)",List.of(new FinancialPlan.Parameter("inicio","date","2026-10-01")),List.of("assistant_finance.transactions"),null);
        String snapshot=mapper.writeValueAsString(Map.of("columns",List.of("total","category_name","count","account_uuid"),"rows",List.of(Map.of("total",new BigDecimal("1234567890123456.78"),"category_name","Categoria teste","count",2,"account_uuid",UUID.randomUUID().toString())),"rowCount",1,"executedAt","2026-10-16T12:00:00Z"));
        return new FinancialAnswerInput(UUID.randomUUID(),UUID.randomUUID(),"Quanto gastei?",List.of(),plan,snapshot);
    }
    AssistantAnswerFormatter.Answer parse(FinancialAnswerInput input,String template) { return formatter.parse(mapper.writeValueAsString(Map.of("template",template)),formatter.prepare(input)); }
    @Test void rendersExactMoneyCountNamesDatesAndBindsAnswerToOwnerAndInput() {
        var input=input();var answer=parse(input,"Gastos em {{r0c1:text}}: {{r0c0:money}}, em {{r0c2:number}} lançamentos desde {{p0:date}}.");
        assertThat(answer.content()).isEqualTo("Gastos em Categoria teste: R$ 1.234.567.890.123.456,78, em 2 lançamentos desde 01/10/2026.");
        assertThat(answer.matches(input,mapper)).isTrue();
        assertThat(answer.matches(new FinancialAnswerInput(UUID.randomUUID(),input.questionId(),input.question(),input.history(),input.plan(),input.resultJson()),mapper)).isFalse();
        assertThat(formatter.prepare(input).payload().toString()).doesNotContain("account_uuid","SELECT amount FROM assistant_finance.transactions WHERE occurred_at>=CAST(:inicio AS timestamp)",input.ownerUuid().toString());
    }
    @ParameterizedTest @ValueSource(strings={"Você gastou R$ 999,00: {{r0c0:money}}","Total {{r9c0:money}}","Total {{r0c1:money}}","Total {{r0c0:banana}}","Total {{r0c0}}","Sem evidência nenhuma.","<b>{{r0c0:money}}</b>","Veja https://example.test {{r0c0:money}}","SELECT {{r0c0:money}}","Primeiro: {{r0c0:money}}; segundo 2", "Cartão {{r0c3:text}}"})
    void rejectsInventedNumbersUnknownReferencesOrUnsafeProse(String template) { assertThatThrownBy(()->parse(input(),template)).isInstanceOf(AssistantAnswerException.class); }
    @Test void nullIsNotZeroAndEmptyResultDoesNotInventRows() {
        var source=input();var row=new LinkedHashMap<String,Object>();row.put("total",null);
        var nullInput=new FinancialAnswerInput(source.ownerUuid(),source.questionId(),source.question(),List.of(),source.plan(),mapper.writeValueAsString(Map.of("columns",List.of("total"),"rows",List.of(row),"rowCount",1)));
        assertThat(parse(nullInput,"Valor {{r0c0:text}}.").content()).isEqualTo("Valor não informado.");
        assertThatThrownBy(()->parse(nullInput,"Valor {{r0c0:money}}.")).isInstanceOf(AssistantAnswerException.class);
        var empty=new FinancialAnswerInput(source.ownerUuid(),source.questionId(),source.question(),List.of(),source.plan(),"{\"columns\":[\"total\"],\"rows\":[],\"rowCount\":0}");
        assertThat(parse(empty,"Não encontrei registros para os filtros consultados.").content()).contains("Não encontrei");
    }
    @Test void uuidAliasIsNotSentToTheWriter() {
        var source=input();String uuid=UUID.randomUUID().toString();
        var aliased=new FinancialAnswerInput(source.ownerUuid(),source.questionId(),source.question(),List.of(),source.plan(),mapper.writeValueAsString(Map.of("columns",List.of("id"),"rows",List.of(Map.of("id",uuid)),"rowCount",1)));
        assertThat(formatter.prepare(aliased).payload().toString()).doesNotContain(uuid);
    }
    @Test void exclusiveEndIsAlwaysExplicitAndNotInferredFromStringLiterals() {
        var source=input();
        var plan=new FinancialPlan(source.plan().catalogVersion(),FinancialPlan.Decision.query,"Período", "SELECT amount FROM assistant_finance.transactions WHERE occurred_at<CAST(:fim AS timestamp) AND description='literal <:inicio'",List.of(new FinancialPlan.Parameter("fim","date","2026-11-01")),source.plan().views(),null);
        var end=new FinancialAnswerInput(source.ownerUuid(),source.questionId(),source.question(),List.of(),plan,source.resultJson());
        assertThat(parse(end,"Total {{r0c0:money}}, antes de {{p0:date}}.").content()).contains("01/11/2026 (não incluído)");
    }
    @Test void rejectsWrongSchemaControlCharactersAndOversizedFinalText() {
        var evidence=formatter.prepare(input());
        for(String json:List.of("{}","{\"template\":null}","{\"template\":3}","{\"template\":\"x\",\"extra\":true}"))
            assertThatThrownBy(()->formatter.parse(json,evidence)).isInstanceOf(AssistantAnswerException.class);
        assertThatThrownBy(()->parse(input(),"x".repeat(4001))).isInstanceOf(AssistantAnswerException.class);
        assertThatThrownBy(()->parse(input(),"\u0000{{r0c0:money}}" )).isInstanceOf(AssistantAnswerException.class);
    }
}
