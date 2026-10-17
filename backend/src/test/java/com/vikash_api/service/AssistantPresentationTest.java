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
class AssistantPresentationTest {
 final JsonMapper mapper=JsonMapper.builder().build();final AssistantAnswerFormatter formatter=new AssistantAnswerFormatter(mapper);
 FinancialAnswerInput input(List<Map<String,Object>> rows) {
  var plan=new FinancialPlan("test",FinancialPlan.Decision.query,"Despesas por categoria","SELECT category_name,SUM(amount) AS total FROM assistant_finance.transactions GROUP BY category_name",List.of(),List.of("assistant_finance.transactions"),null);
  return new FinancialAnswerInput(UUID.randomUUID(),UUID.randomUUID(),"Mostre por categoria",List.of(),plan,mapper.writeValueAsString(Map.of("columns",List.of("category_name","total"),"rows",rows,"rowCount",rows.size(),"executedAt","2026-10-16T21:00:00Z")));
 }
 List<Map<String,Object>> rows(){return List.of(Map.of("category_name","Mercado","total",new BigDecimal("150.00")),Map.of("category_name","Transporte","total",new BigDecimal("50.25")));}
 Map<String,Object> chart(String type){return Map.of("type",type,"title","Gastos por categoria","caption","Valores consultados","labelColumn","category_name","valueColumn","total","format","money");}
 AssistantAnswerFormatter.Answer parse(FinancialAnswerInput input,Object blocks) {return formatter.parse(mapper.writeValueAsString(Map.of("template","Mercado: {{r0c1:money}}.","blocks",blocks)),formatter.prepare(input));}
 @Test void exactQueryValuesAndAllRowsBecomeTypedChartWithoutIdsOrSql() {
  var input=input(rows());var answer=parse(input,List.of(chart("pie")));var p=answer.presentation();
  assertThat(p.version()).isEqualTo(FinancialReplyPresentation.VERSION);assertThat(p.queriedAt()).isEqualTo("2026-10-16T21:00:00Z");
  assertThat(p.blocks().getFirst().items()).extracting(FinancialReplyPresentation.Item::value).containsExactly("150.00","50.25");
  assertThat(p.blocks().getFirst().items().getLast().formattedValue()).isEqualTo("R$ 50,25");
  assertThat(mapper.writeValueAsString(p)).doesNotContain("SELECT","ownerUuid",input.ownerUuid().toString());
  assertThat(answer.matches(input,mapper)).isTrue();assertThat(answer.matches(input(rows()),mapper)).isFalse();
  assertThatThrownBy(()->p.blocks().clear()).isInstanceOf(UnsupportedOperationException.class);
 }
 @ParameterizedTest @ValueSource(strings={"pie","bar","list"}) void permitsOnlyKnownVisuals(String type){assertThat(parse(input(rows()),List.of(chart(type))).presentation().blocks().getFirst().type()).isEqualTo(type);}
 @Test void metricMustBeNumericResultReferenceAndTitlesUseSameGrounding() {
  var block=Map.of("type","metric","title","Total em {{r0c0:text}}","caption","Consulta atual","value","{{r0c1:money}}");
  var metric=parse(input(rows()),List.of(block)).presentation().blocks().getFirst();assertThat(metric.value()).isEqualTo("R$ 150,00");assertThat(metric.title()).isEqualTo("Total em Mercado");
  for(String value:List.of("R$ 999,00","{{p0:money}}","{{r0c0:text}}","{{r9c1:money}}")) {
   var invalid=new HashMap<>(block);invalid.put("value",value);assertThatThrownBy(()->parse(input(rows()),List.of(invalid))).isInstanceOf(AssistantAnswerException.class);
  }
 }
 @Test void blocksUnknownTypesColumnsExtraExecutableFieldsAndFabricatedTitleNumbers() {
  for(var change:List.of(Map.of("type","html"),Map.of("valueColumn","other_users_balance"),Map.of("labelColumn","account_uuid"),Map.of("format","html"),Map.of("title","Total R$ 9999"),Map.of("caption","<script>"),Map.of("url","https://external.test"))) {
   var block=new HashMap<String,Object>(chart("pie"));block.putAll(change);assertThatThrownBy(()->parse(input(rows()),List.of(block))).isInstanceOf(AssistantAnswerException.class);
  }
  assertThatThrownBy(()->parse(input(rows()),List.of(chart("bar"),chart("pie")))).isInstanceOf(AssistantAnswerException.class);
 }
 @Test void negativeZeroHugeDuplicateAndLongSeriesUseHonestPaginatedList() {
  for(String value:List.of("-50","0","1234567890123456.78")) {
   var input=input(List.of(Map.of("category_name","Mercado","total",new BigDecimal(value))));
   var block=parse(input,List.of(chart("pie"))).presentation().blocks().getFirst();assertThat(block.type()).isEqualTo("list");assertThat(block.items().getFirst().value()).isEqualTo(value);
  }
  var duplicate=input(List.of(rows().getFirst(),rows().getFirst()));assertThat(parse(duplicate,List.of(chart("pie"))).presentation().blocks().getFirst().type()).isEqualTo("list");
  var many=new ArrayList<Map<String,Object>>();for(int i=0;i<100;i++)many.add(Map.of("category_name","Categoria "+i,"total",i+1));
  var presentation=parse(input(many),List.of(chart("pie"))).presentation();assertThat(presentation.limited()).isTrue();assertThat(presentation.blocks().getFirst().items()).hasSize(100);assertThat(presentation.blocks().getFirst().type()).isEqualTo("list");
 }
 @Test void oldPlainTextAndEmptyAnswerRemainCompatible() {
  assertThat(formatter.parse("{\"template\":\"Total {{r0c1:money}}.\"}",formatter.prepare(input(rows()))).presentation()).isNull();
  var empty=input(List.of());assertThat(formatter.parse(mapper.writeValueAsString(Map.of("template","Não encontrei registros.","blocks",List.of(chart("pie")))),formatter.prepare(empty)).presentation()).isNull();
 }
}
