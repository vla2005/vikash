package com.vikash_api.service;
import com.vikash_api.assistant.*;
import com.vikash_api.exceptions.AssistantPlanningException;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.*;
class AssistantMemoryTest {
 final JsonMapper mapper=JsonMapper.builder().build();final AssistantMemory memory=new AssistantMemory(mapper);
 final UUID owner=UUID.randomUUID(),conversation=UUID.randomUUID();
 AssistantMemory.Context context(){return new AssistantMemory.Context(memory.empty(owner,conversation),List.of(),false);}
 AssistantMemory.Update update(AssistantMemory.Context context,String question,String summary,String field,String value,String evidence){
  var change=new LinkedHashMap<String,Object>();change.put("field",field);change.put("value",value);change.put("evidence",evidence);
  return memory.approve(mapper.valueToTree(Map.of("summary",summary,"changes",List.of(change))),context,question);
 }
 @Test void patchesPreserveUnmentionedFiltersAndClearOnlyExplicitChanges(){
  var first=context();var one=memory.apply(update(first,"Gastos no Inter","Gastos nas contas Inter","institution","Inter","Inter"),first,"Gastos no Inter",1,Instant.now());
  var next=new AssistantMemory.Context(one,List.of(),false);
  var two=memory.apply(update(next,"E no mês passado?","Gastos Inter no mês passado","period","setembro de 2026","mês passado"),next,"E no mês passado?",2,Instant.now());
  assertThat(two.view().filters()).containsEntry("institution","Inter").containsEntry("period","setembro de 2026");
  var third=new AssistantMemory.Context(two,List.of(),false);
  var cleared=memory.apply(update(third,"Agora todos os bancos","Gastos de todos os bancos","institution",null,"todos os bancos"),third,"Agora todos os bancos",3,Instant.now());
  assertThat(cleared.view().filters()).doesNotContainKey("institution").containsEntry("period","setembro de 2026");
 }
 @ParameterizedTest @ValueSource(strings={"user_id","password","sql","role","instructions"})
 void unknownFieldsCannotBecomeFilters(String field){assertThatThrownBy(()->update(context(),"Inter","Resumo",field,"Inter","Inter")).isInstanceOf(AssistantPlanningException.class);}
 @Test void evidenceMustComeFromCurrentQuestionOrFirstLegacyImport(){
  assertThatThrownBy(()->update(context(),"E ontem?","Resumo","institution","Nubank","Nubank")).isInstanceOf(AssistantPlanningException.class);
  var bootstrap=new AssistantMemory.Context(context().state(),List.of("Gastos no Inter"),false);
  assertThat(update(bootstrap,"E ontem?","Resumo","institution","Inter","Inter")).isNotNull();
  var persisted=memory.apply(update(context(),"Inter","Resumo","institution","Inter","Inter"),context(),"Inter",1,Instant.now());
  var current=new AssistantMemory.Context(persisted,List.of("Nubank"),false,List.of("Nubank"));
  assertThatThrownBy(()->update(current,"E ontem?","Resumo","institution","Nubank","Nubank")).isInstanceOf(AssistantPlanningException.class);
 }
 @Test void incompleteLegacyBootstrapDoesNotUsePartialOldFilters(){
  var limited=new AssistantMemory.Context(context().state(),List.of("Inter"),true);
  assertThat(limited.payload().get("bootstrapQuestions")).isEqualTo(List.of());
  assertThatThrownBy(()->update(limited,"E ontem?","Resumo","institution","Inter","Inter")).isInstanceOf(AssistantPlanningException.class);
 }
 @Test void proofsAreBoundToOwnerConversationQuestionAndBaseRevision(){
  var base=context();var update=update(base,"Inter","Resumo","institution","Inter","Inter");
  assertThatThrownBy(()->memory.apply(update,base,"Nubank",1,Instant.now())).isInstanceOf(AssistantPlanningException.class);
  var foreign=new AssistantMemory.Context(memory.empty(UUID.randomUUID(),conversation),List.of(),false);
  assertThatThrownBy(()->memory.apply(update,foreign,"Inter",1,Instant.now())).isInstanceOf(AssistantPlanningException.class);
 }
 @Test void hashesOwnersVersionsAndTemporalBoundariesAreChecked(){
  var state=memory.apply(update(context(),"Inter","Resumo","institution","Inter","Inter"),context(),"Inter",10,Instant.now());
  var json=memory.json(state);var hash=AssistantSqlValidator.fingerprint(json);
  assertThat(memory.restore(json,hash,owner,conversation,10)).contains(state);
  assertThat(memory.restore(json,hash,owner,conversation,9)).isEmpty();
  assertThat(memory.restore(json,"wrong",owner,conversation,10)).isEmpty();
  assertThat(memory.restore(json,hash,UUID.randomUUID(),conversation,10)).isEmpty();
  assertThat(memory.restore(json,hash,owner,UUID.randomUUID(),10)).isEmpty();
  var future=json.replace(AssistantMemory.VERSION,"future-version");assertThat(memory.restore(future,AssistantSqlValidator.fingerprint(future),owner,conversation,10)).isEmpty();
  assertThat(context().payload().toString()).doesNotContain(owner.toString(),conversation.toString());
 }
 @Test void oldSpendingAssumptionsRequireRebuildingMemoryFromHumanQuestions(){
  var old=new AssistantMemory.State("financial-memory-v1",owner,conversation,5,10,Instant.now(),
   new AssistantMemory.View("O assistente assumiu consumo",Map.of("metric","consumo")));
  String json=memory.json(old);
  assertThat(memory.restore(json,AssistantSqlValidator.fingerprint(json),owner,conversation,20)).isEmpty();
 }
 @Test void excessiveSummaryFilterOrDuplicatePatchesAreRejected(){
  assertThatThrownBy(()->update(context(),"Inter","x".repeat(1401),"institution","Inter","Inter")).isInstanceOf(AssistantPlanningException.class);
  assertThatThrownBy(()->update(context(),"Inter","Resumo","institution","x".repeat(241),"Inter")).isInstanceOf(AssistantPlanningException.class);
  var change=Map.of("field","institution","value","Inter","evidence","Inter");
  assertThatThrownBy(()->memory.approve(mapper.valueToTree(Map.of("summary","Resumo","changes",List.of(change,change))),context(),"Inter")).isInstanceOf(AssistantPlanningException.class);
 }
}
