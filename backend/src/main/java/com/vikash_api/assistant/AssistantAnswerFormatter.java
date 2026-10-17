package com.vikash_api.assistant;

import com.vikash_api.exceptions.AssistantAnswerException;
import java.math.*;
import java.lang.reflect.Modifier;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.expression.*;
import net.sf.jsqlparser.expression.operators.relational.*;
import java.text.NumberFormat;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import tools.jackson.databind.*;

/** Os números são substituídos pela API a partir das células, sem aritmética do modelo. */
@lombok.extern.slf4j.Slf4j @Component
public class AssistantAnswerFormatter {
    public static final String VERSION="financial-answer-v2";
    private final ObjectMapper mapper;
    private static final Pattern TOKEN=Pattern.compile("\\{\\{([rp][0-9]+(?:c[0-9]+)?):(money|number|text|date)\\}\\}");
    private static final Pattern UNSAFE=Pattern.compile("(?i)https?://|www\\.|<|>|```|\\b(?:SELECT|INSERT|UPDATE|DELETE|DROP|pg_catalog|assistant_finance|systemInstruction|api[_ -]?key)\\b");
    public AssistantAnswerFormatter(ObjectMapper mapper) { this.mapper=mapper; }
    private record Fact(String column,Map<String,String> formats,boolean result) {}
    public static final class Evidence {
        private final String hash;
        private final Map<String,Object> payload;
        private final Map<String,Fact> facts;
        private final JsonNode result;
        private Evidence(String hash,Map<String,Object> payload,Map<String,Fact> facts,JsonNode result) { this.hash=hash;this.payload=payload;this.facts=facts;this.result=result; }
        public Map<String,Object> payload() { return payload; }
    }
    public static final class Answer {
        private final String content,inputHash;
        private final FinancialReplyPresentation presentation;
        private Answer(String content,String inputHash,FinancialReplyPresentation presentation) { this.content=content;this.inputHash=inputHash;this.presentation=presentation; }
        public FinancialReplyPresentation presentation() { return presentation; }
        public String content() { return content; }
        public String inputHash() { return inputHash; }
        public boolean matches(FinancialAnswerInput input,ObjectMapper mapper) { return inputHash.equals(fingerprint(input,mapper)); }
    }
    private static String fingerprint(FinancialAnswerInput input,ObjectMapper mapper) { return AssistantSqlValidator.fingerprint(mapper.writeValueAsString(input)); }
    public Evidence prepare(FinancialAnswerInput input) {
        try {
            if (input==null || input.ownerUuid()==null || input.questionId()==null || input.plan().decision()!=FinancialPlan.Decision.query || input.resultJson().length()>65536) throw invalid();
            JsonNode result=mapper.reader().with(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readTree(input.resultJson());
            var columns=result.path("columns");var rows=result.path("rows");
            if (!columns.isArray() || columns.size()>24 || !rows.isArray() || rows.size()>100 || result.path("rowCount").asInt(-1)!=rows.size()) throw invalid();
            var facts=new LinkedHashMap<String,Fact>();
            var sent=new ArrayList<Map<String,Object>>();
            for(int r=0;r<rows.size();r++) {
                if (!rows.path(r).isObject()) throw invalid();
                for(int c=0;c<columns.size();c++) {
                    String column=columns.path(c).asText();
                    if (column.endsWith("_uuid") || column.equals("uuid") || column.equals("category_key")) continue; // minimização: IDs técnicos não vão ao redator
                    JsonNode value=rows.path(r).path(column);
                    if (value.isMissingNode() || (value.isArray() || value.isObject())) throw invalid();
                    if(value.isString() && value.asText().matches("(?i)(?:custom:)?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"))continue;
                    add(facts,sent,"r"+r+"c"+c,column,formats(value),true);
                }
            }
            var exclusiveEnds=exclusiveEnds(input.plan().sql());
            for(int i=0;i<input.plan().parameters().size();i++) {
                var parameter=input.plan().parameters().get(i);
                var formats=new LinkedHashMap<String,String>();formats.put("text",parameter.value());
                if (Set.of("date","timestamp").contains(parameter.type())) {
                    String suffix=exclusiveEnds.contains(parameter.name())?" (não incluído)":"";
                    formats.put("text",parameter.value()+suffix);
                    if(parameter.type().equals("date"))formats.put("date",date(parameter.value())+suffix);
                }
                add(facts,sent,"p"+i,parameter.name(),Map.copyOf(formats),false);
            }
            var payload=new LinkedHashMap<String,Object>();
            payload.put("question",input.question());payload.put("messages",input.history());payload.put("conversationMemory",input.memory());
            payload.put("interpretation",input.plan().interpretation());
            payload.put("rowCount",rows.size());payload.put("resultMayBeLimited",rows.size()>=100);payload.put("queriedAt",result.path("executedAt").asText());
            payload.put("facts",List.copyOf(sent));payload.put("currency","BRL");payload.put("timezone","America/Sao_Paulo");
            return new Evidence(fingerprint(input,mapper),Collections.unmodifiableMap(payload),Map.copyOf(facts),result);
        } catch (RuntimeException failure) { if(failure instanceof AssistantAnswerException known) throw known;throw new AssistantAnswerException("INVALID",failure); }
    }
    private void add(Map<String,Fact> facts,List<Map<String,Object>> sent,String id,String column,Map<String,String> formats,boolean result) {
        if(facts.size()>=2400) throw new AssistantAnswerException("CONTEXT_LIMIT");
        facts.put(id,new Fact(column,formats,result));
        sent.add(Map.of("id",id,"column",column,"source",result?"query":"filter","formats",formats));
    }
    private Map<String,String> formats(JsonNode value) {
        if (value.isNull()) return Map.of("text","não informado");
        if (value.isNumber()) {
            BigDecimal decimal=value.decimalValue();
            if (decimal.precision()>128 || Math.abs(decimal.scale())>128) throw invalid();
            var number=NumberFormat.getNumberInstance(Locale.forLanguageTag("pt-BR"));
            number.setMaximumFractionDigits(Math.max(2,decimal.scale()));number.setMinimumFractionDigits(0);
            var money=NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR"));money.setRoundingMode(RoundingMode.HALF_UP);
            return Map.of("number",number.format(decimal),"money",money.format(decimal).replace('\u00a0',' '));
        }
        if (value.isBoolean()) return Map.of("text",value.asBoolean()?"sim":"não");
        String text=value.asText();
        if (text.length()>4096 || text.chars().anyMatch(c->Character.isISOControl(c) && c!='\n' && c!='\t')) throw invalid();
        var formats=new LinkedHashMap<String,String>();formats.put("text",text);
        if(text.matches("\\d{4}-\\d{2}-\\d{2}")) formats.put("date",date(text));
        return Map.copyOf(formats);
    }
    // Lê somente a AST já validada: nenhum regex sobre literais para inferir limites.
    private Set<String> exclusiveEnds(String sql) {
        var ends=new HashSet<String>();
        try {
            scanBounds(CCJSqlParserUtil.parse(sql,p->p.withTimeOut(1000)),ends,Collections.newSetFromMap(new IdentityHashMap<>()),0);
            return ends;
        } catch(Exception failure) { throw new AssistantAnswerException("INVALID",failure); }
    }
    private void scanBounds(Object node,Set<String> ends,Set<Object> seen,int depth) throws IllegalAccessException {
        if(node==null || seen.contains(node))return;
        if(depth>64)throw invalid();
        if(seen.size()>2500)throw invalid();
        if(node instanceof Iterable<?> list) { seen.add(node);for(var child:list)scanBounds(child,ends,seen,depth+1);return; }
        if(!node.getClass().getPackageName().startsWith("net.sf.jsqlparser"))return;
        seen.add(node);
        if(node instanceof MinorThan comparison) { String key=parameter(comparison.getRightExpression());if(key!=null)ends.add(key); }
        if(node instanceof GreaterThan comparison) { String key=parameter(comparison.getLeftExpression());if(key!=null)ends.add(key); }
        for(Class<?> type=node.getClass();type!=null && type.getPackageName().startsWith("net.sf.jsqlparser");type=type.getSuperclass()) {
            if(type.getSimpleName().equals("ASTNodeAccessImpl"))continue;
            for(var field:type.getDeclaredFields()) {
                if(Modifier.isStatic(field.getModifiers()) || field.isSynthetic())continue;
                field.setAccessible(true);scanBounds(field.get(node),ends,seen,depth+1);
            }
        }
    }
    private String parameter(Expression expression) {
        if(expression instanceof JdbcNamedParameter named)return named.getName();
        if(expression instanceof CastExpression cast)return parameter(cast.getLeftExpression());
        if(expression instanceof ParenthesedExpressionList<?> list && list.size()==1)return parameter(list.getFirst());
        return null;
    }
    private String date(String value) { return LocalDate.parse(value).format(DateTimeFormatter.ofPattern("dd/MM/uuuu")); }
    public Answer parse(String json,Evidence evidence) {
        try {
            JsonNode root=mapper.readTree(json);
            if(root==null || !root.isObject() || !Set.of("template","blocks").containsAll(root.propertyNames()) || !root.path("template").isString()) throw invalid();
            String template=root.path("template").asText().strip();
            if(template.isEmpty() || template.length()>4000) throw invalid();
            var match=TOKEN.matcher(template);var rendered=new StringBuilder();int end=0,refs=0;boolean citedResult=false;
            while(match.find()) {
                prose(template.substring(end,match.start()));
                var fact=evidence.facts.get(match.group(1));
                if(fact==null || !fact.formats.containsKey(match.group(2)) || ++refs>120) throw invalid("REFERENCE");
                rendered.append(template,end,match.start()).append(fact.formats.get(match.group(2)));
                citedResult|=fact.result;end=match.end();
            }
            prose(template.substring(end));rendered.append(template.substring(end));
            if(evidence.facts.values().stream().anyMatch(Fact::result) && !citedResult) throw invalid("RESULT_NOT_CITED");
            String content=rendered.toString();
            if(content.length()>6000 || content.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>24000) throw invalid();
            return new Answer(content,evidence.hash,presentation(root.path("blocks"),evidence));
        } catch(RuntimeException failure) { if(failure instanceof AssistantAnswerException known) throw known;throw new AssistantAnswerException("INVALID",failure); }
    }

    private String caption(JsonNode node,Evidence evidence,int max,boolean required) {
        if(!node.isString())throw invalid("VISUAL_TEXT");
        String text=node.asText().strip();if(text.length()>max || required && text.isBlank())throw invalid("VISUAL_TEXT");
        var matcher=TOKEN.matcher(text);var rendered=new StringBuilder();int end=0;
        while(matcher.find()) {
            prose(text.substring(end,matcher.start()));var fact=evidence.facts.get(matcher.group(1));
            if(fact==null || !fact.formats.containsKey(matcher.group(2)))throw invalid("VISUAL_REFERENCE");
            rendered.append(text,end,matcher.start()).append(fact.formats.get(matcher.group(2)));end=matcher.end();
        }
        prose(text.substring(end));rendered.append(text.substring(end));
        if(rendered.length()>max*3)throw invalid("VISUAL_TEXT");return rendered.toString();
    }
    private FinancialReplyPresentation presentation(JsonNode blocks,Evidence evidence) {
        if(blocks.isMissingNode())return null; // compatibilidade com respostas e fixtures anteriores
        if(!blocks.isArray() || blocks.size()>3)throw invalid("VISUAL_STRUCTURE");
        var result=new ArrayList<FinancialReplyPresentation.Block>();int charts=0;
        var columns=evidence.result.path("columns");var rows=evidence.result.path("rows");
        for(var block:blocks) {
            String type=block.path("type").asText();boolean metric=type.equals("metric");
            if(!Set.of("metric","pie","bar","list").contains(type) || !block.isObject())throw invalid("VISUAL_TYPE");
            var keys=new HashSet<>(block.propertyNames());
            if(!keys.equals(metric?Set.of("type","title","caption","value"):Set.of("type","title","caption","labelColumn","valueColumn","format")))throw invalid("VISUAL_STRUCTURE");
            String title=caption(block.path("title"),evidence,120,true),caption=caption(block.path("caption"),evidence,240,false);
            if(metric) {
                var ref=TOKEN.matcher(block.path("value").asText());
                if(!ref.matches())throw invalid("VISUAL_METRIC");var fact=evidence.facts.get(ref.group(1));
                if(fact==null || !fact.result || !Set.of("money","number").contains(ref.group(2)) || !fact.formats.containsKey(ref.group(2)))throw invalid("VISUAL_METRIC");
                result.add(new FinancialReplyPresentation.Block(type,title,caption,fact.formats.get(ref.group(2)),ref.group(2),List.of()));continue;
            }
            if(++charts>1)throw invalid("VISUAL_LIMIT");
            String label=block.path("labelColumn").asText(),value=block.path("valueColumn").asText(),format=block.path("format").asText();
            if(label.equals(value) || !Set.of("money","number").contains(format))throw invalid("VISUAL_COLUMN");
            int lc=-1,vc=-1;
            for(int i=0;i<columns.size();i++) { if(columns.path(i).asText().equals(label))lc=i;if(columns.path(i).asText().equals(value))vc=i; }
            if(lc<0 || vc<0)throw invalid("VISUAL_COLUMN");
            var items=new ArrayList<FinancialReplyPresentation.Item>();var seen=new HashSet<String>();boolean drawable=true;
            for(int r=0;r<rows.size();r++) {
                var lf=evidence.facts.get("r"+r+"c"+lc);var vf=evidence.facts.get("r"+r+"c"+vc);
                if(lf==null || vf==null || !lf.formats.containsKey("text") && !lf.formats.containsKey("date") || !vf.formats.containsKey(format))throw invalid("VISUAL_COLUMN");
                String name=lf.formats.getOrDefault("date",lf.formats.get("text"));
                var cell=rows.path(r).path(value);
                if(!cell.isNumber() || name.length()>240)throw invalid("VISUAL_VALUE");
                if(!seen.add(name))drawable=false;
                BigDecimal number=cell.decimalValue();
                // Número exato fica em string; o gráfico só usa coordenadas seguras para JS.
                if(number.signum()<0 || number.abs().compareTo(new BigDecimal("90071992547409"))>0 || number.signum()!=0 && number.abs().compareTo(new BigDecimal("0.000001"))<0)drawable=false;
                items.add(new FinancialReplyPresentation.Item(name,number.toPlainString(),vf.formats.get(format)));
            }
            if(items.isEmpty())continue;
            boolean positive=items.stream().anyMatch(i->new BigDecimal(i.value()).signum()>0);
            if(items.size()>12 || !drawable || !positive || rows.size()>=100)type="list";
            result.add(new FinancialReplyPresentation.Block(type,title,caption,null,format,items));
        }
        if(result.isEmpty())return null;
        String queriedAt=evidence.result.path("executedAt").asText("");
        if(!queriedAt.isEmpty()) {try {Instant.parse(queriedAt);}catch(Exception failure){throw invalid("VISUAL_DATE");}}
        var presentation=new FinancialReplyPresentation(FinancialReplyPresentation.VERSION,result,queriedAt,rows.size()>=100);
        if(mapper.writeValueAsString(presentation).getBytes(java.nio.charset.StandardCharsets.UTF_8).length>48000)throw invalid("VISUAL_LIMIT");
        return presentation;
    }

    private void prose(String text) {
        if(text.codePoints().anyMatch(Character::isDigit))throw invalid("UNREFERENCED_NUMBER");
        if(text.contains("{") || text.contains("}") || UNSAFE.matcher(text).find() || text.codePoints().anyMatch(c->Character.isISOControl(c) && c!='\n' && c!='\t'))throw invalid("UNSAFE_PROSE");
    }
    private AssistantAnswerException invalid() { return invalid("STRUCTURE_OR_LIMIT"); }
    private AssistantAnswerException invalid(String rule) {
        log.info("event=assistant.answer.validation.rejected rule={} answerVersion={}",rule,VERSION);
        return new AssistantAnswerException("INVALID");
    }
}
