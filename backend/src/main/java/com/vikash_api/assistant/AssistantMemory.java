package com.vikash_api.assistant;

import com.vikash_api.exceptions.AssistantPlanningException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Instant;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.*;

/** Memória de intenção, nunca fonte de fatos financeiros nem autorização de SQL. */
@Slf4j @Component
public class AssistantMemory {
    public static final String VERSION="financial-memory-v2";
    public static final Set<String> FIELDS=Set.of("scope","institution","account","card","category","paymentMethod","period","metric","comparison","criteria");
    private final ObjectMapper mapper;
    private final String instructions;
    public AssistantMemory(ObjectMapper mapper) {
        this.mapper=mapper;
        try {instructions=new ClassPathResource("prompts/financial-memory.txt").getContentAsString(StandardCharsets.UTF_8);}
        catch(java.io.IOException failure){throw new IllegalStateException("Prompt de memória indisponível.",failure);}
    }
    public record View(String summary,Map<String,String> filters) {
        public View {filters=Collections.unmodifiableMap(new TreeMap<>(filters));}
        public static View empty(){return new View("",Map.of());}
    }
    public record State(String version,UUID ownerUuid,UUID conversationUuid,long revision,long throughMessageId,Instant updatedAt,View view) {}
    public record Context(State state,List<String> bootstrapQuestions,boolean bootstrapLimited,List<String> recentQuestions) {
        public Context(State state,List<String> bootstrapQuestions,boolean bootstrapLimited){this(state,bootstrapQuestions,bootstrapLimited,List.of());}
        public Context {bootstrapQuestions=List.copyOf(bootstrapQuestions);recentQuestions=List.copyOf(recentQuestions);}
        public Map<String,Object> payload(){return Map.of("summary",state.view().summary(),"filters",state.view().filters(),"asOf",state.updatedAt().toString(),"bootstrapQuestions",bootstrapLimited?List.of():bootstrapQuestions,"bootstrapLimited",bootstrapLimited);}
    }
    public record Change(String field,String value,String evidence) {}
    public static final class Update {
        private final String summary,baseHash,questionHash;
        private final List<Change> changes;
        private Update(String summary,List<Change> changes,String baseHash,String questionHash){this.summary=summary;this.changes=List.copyOf(changes);this.baseHash=baseHash;this.questionHash=questionHash;}
        public boolean matches(Context context,String question,AssistantMemory memory){return baseHash.equals(memory.hash(context)) && questionHash.equals(AssistantSqlValidator.fingerprint(question));}
    }
    public String instructions(){return instructions;}
    public State empty(UUID owner,UUID conversation){return new State(VERSION,owner,conversation,0,0,Instant.EPOCH,View.empty());}
    public String json(State state){return mapper.writeValueAsString(state);}
    public String hash(Object value){return AssistantSqlValidator.fingerprint(mapper.writeValueAsString(value));}
    public Optional<State> restore(String json,String hash,UUID owner,UUID conversation,long beforeMessageId){
        if(json==null)return Optional.empty();
        try {
            if(json.getBytes(StandardCharsets.UTF_8).length>12000 || !AssistantSqlValidator.fingerprint(json).equals(hash))throw invalid();
            State state=mapper.readValue(json,State.class);
            if(!VERSION.equals(state.version()) || !owner.equals(state.ownerUuid()) || !conversation.equals(state.conversationUuid()) || state.revision()<0 || state.throughMessageId()<0 || state.throughMessageId()>beforeMessageId || state.updatedAt()==null)throw invalid();
            validateView(state.view());return Optional.of(state);
        } catch(RuntimeException failure){log.info("event=assistant.memory.ignored reason=INVALID_SNAPSHOT memoryVersion={}",VERSION);return Optional.empty();}
    }
    private void validateView(View view){
        if(view==null || view.summary()==null || view.summary().length()>1400 || view.filters().size()>10 || !FIELDS.containsAll(view.filters().keySet()))throw invalid();
        for(var value:view.filters().values())if(value==null || value.isBlank() || value.length()>240 || controls(value))throw invalid();
        if(controls(view.summary()))throw invalid();
    }
    public Update approve(JsonNode root,Context context,String question){
        try {
            if(root==null || !root.isObject() || !new HashSet<>(root.propertyNames()).equals(Set.of("summary","changes")) || !root.path("summary").isString() || !root.path("changes").isArray() || root.path("changes").size()>10)throw invalid();
            String summary=root.path("summary").asText().strip();
            if(summary.length()>1400 || controls(summary))throw invalid();
            var changes=new ArrayList<Change>();var fields=new HashSet<String>();
            var sources=new ArrayList<String>();sources.add(question);
            if(context.state().revision()==0){if(!context.bootstrapLimited())sources.addAll(context.bootstrapQuestions());sources.addAll(context.recentQuestions());}
            for(var change:root.path("changes")){
                if(!change.isObject() || !new HashSet<>(change.propertyNames()).equals(Set.of("field","value","evidence")) || !change.path("field").isString() || !change.path("evidence").isString() || (!change.path("value").isString() && !change.path("value").isNull()))throw invalid();
                String field=change.path("field").asText(),evidence=change.path("evidence").asText().strip();
                String value=change.path("value").isNull()?null:change.path("value").asText().strip();
                if(!FIELDS.contains(field) || !fields.add(field) || evidence.isEmpty() || evidence.length()>240 || controls(evidence) || value!=null && (value.isEmpty() || value.length()>240 || controls(value)))throw invalid();
                if(sources.stream().noneMatch(source->normalize(source).contains(normalize(evidence))))throw invalid();
                changes.add(new Change(field,value,evidence));
            }
            return new Update(summary,changes,hash(context),AssistantSqlValidator.fingerprint(question));
        }catch(RuntimeException failure){log.info("event=assistant.memory.update.rejected reason=INVALID_UPDATE memoryVersion={}",VERSION);if(failure instanceof AssistantPlanningException known)throw known;throw invalid();}
    }
    public State apply(Update update,Context base,String question,long messageId,Instant at){
        if(update==null || !update.matches(base,question,this))throw invalid();
        var filters=new TreeMap<>(base.state().view().filters());
        for(var change:update.changes)if(change.value()==null)filters.remove(change.field());else filters.put(change.field(),change.value());
        var view=new View(update.summary,filters);validateView(view);
        var state=new State(VERSION,base.state().ownerUuid(),base.state().conversationUuid(),base.state().revision()+1,messageId,at,view);
        if(json(state).getBytes(StandardCharsets.UTF_8).length>12000)throw invalid();return state;
    }
    public Map<String,Object> schema(){
        var change=Map.of("type","object","properties",Map.of("field",Map.of("type","string","enum",FIELDS),"value",Map.of("type",List.of("string","null"),"maxLength",240),"evidence",Map.of("type","string","maxLength",240)),"required",List.of("field","value","evidence"),"additionalProperties",false);
        return Map.of("type","object","properties",Map.of("summary",Map.of("type","string","maxLength",1400),"changes",Map.of("type","array","maxItems",10,"items",change)),"required",List.of("summary","changes"),"additionalProperties",false);
    }
    private static String normalize(String text){return Normalizer.normalize(text,Normalizer.Form.NFKC).toLowerCase(Locale.ROOT).replaceAll("\\s+"," ").strip();}
    private static boolean controls(String text){return text.codePoints().anyMatch(c->Character.isISOControl(c) && c!='\n' && c!='\t');}
    private AssistantPlanningException invalid(){return new AssistantPlanningException("O Gemini retornou uma atualização de contexto inválida.");}
}
