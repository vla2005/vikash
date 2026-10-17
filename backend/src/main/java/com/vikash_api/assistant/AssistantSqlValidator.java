package com.vikash_api.assistant;

import com.vikash_api.exceptions.AssistantSqlRejectedException;
import java.lang.reflect.Modifier;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import net.sf.jsqlparser.expression.*;
import net.sf.jsqlparser.expression.operators.arithmetic.*;
import net.sf.jsqlparser.expression.operators.conditional.*;
import net.sf.jsqlparser.expression.operators.relational.*;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.schema.Column;
import net.sf.jsqlparser.schema.Table;
import net.sf.jsqlparser.statement.select.*;
import org.springframework.stereotype.Component;

/** Compila uma AST permitida para SQL novo. O texto original nunca é executável. */
@Slf4j @Component
public final class AssistantSqlValidator {
    public static final String POLICY_VERSION = "financial-select-v1";
    private final FinancialCatalog catalog;
    public AssistantSqlValidator(FinancialCatalog catalog) { this.catalog = catalog; }
    public record Binding(String type, Object value) {}
    /** Só este validador pode construir o resultado; não é um DTO de entrada. */
    public static final class ValidatedSql {
        private final String sql;
        private final Map<String, Binding> bindings;
        private final FinancialPlan source;
        private ValidatedSql(String sql, Map<String, Binding> bindings, FinancialPlan plan) {
            this.sql = sql; this.bindings = Map.copyOf(bindings);
            source = new FinancialPlan(plan.catalogVersion(), plan.decision(), plan.interpretation(), plan.sql(),
                    List.copyOf(plan.parameters()), List.copyOf(plan.views()), plan.clarification());
        }
        public String sql() { return sql; }
        public Map<String, Binding> bindings() { return bindings; }
        public boolean matches(FinancialPlan plan) { return source.equals(plan); }
        public String fingerprint() { return AssistantSqlValidator.fingerprint(sql); }
    }
    public static String fingerprint(String sql) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(sql.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    public ValidatedSql validate(FinancialPlan plan) {
        long start = System.nanoTime();
        try {
            if (plan == null || plan.decision() != FinancialPlan.Decision.query || !catalog.version().equals(plan.catalogVersion())) throw reject("PLAN");
            String sql = preflight(plan.sql());
            var statements = CCJSqlParserUtil.parseStatements(sql, parser -> parser.withTimeOut(1000).withAllowComplexParsing(false));
            if (statements.size() != 1 || !(statements.get(0) instanceof Select select)) throw reject("SELECT_ONLY");
            var compiler = new Compiler(plan);
            Query compiled = compiler.select(select, new LinkedHashMap<>(), 0, true);
            if (!compiler.usedParameters.equals(compiler.inputParameters.keySet())) throw reject("PARAMETERS");
            if (plan.views() == null || plan.views().size() != new HashSet<>(plan.views()).size() || !compiler.views.equals(new HashSet<>(plan.views()))) throw reject("VIEWS_MISMATCH");
            var result = new ValidatedSql(compiled.sql(), compiler.bindings, plan);
            log.info("event=assistant.sql.accepted policyVersion={} viewCount={} parameterCount={} durationMs={} sqlExecuted=false", POLICY_VERSION, compiler.views.size(), result.bindings.size(), (System.nanoTime()-start)/1_000_000);
            return result;
        } catch (AssistantSqlRejectedException failure) {
            log.info("event=assistant.sql.rejected policyVersion={} reason={} durationMs={} sqlExecuted=false", POLICY_VERSION, failure.getReason(), (System.nanoTime()-start)/1_000_000); throw failure;
        } catch (Exception | StackOverflowError failure) {
            // Não propagar o erro do parser: ele pode conter SQL e valores sensíveis.
            log.info("event=assistant.sql.rejected policyVersion={} reason=PARSE_OR_UNSUPPORTED sqlExecuted=false", POLICY_VERSION);
            throw reject("PARSE_OR_UNSUPPORTED");
        }
    }
    private static AssistantSqlRejectedException reject(String reason) { return new AssistantSqlRejectedException(reason); }
    private static String id(String value) {
        if (value == null || !value.matches("[A-Za-z_][A-Za-z0-9_]{0,62}")) throw reject("IDENTIFIER");
        return value.toLowerCase(Locale.ROOT);
    }
    private static String q(String name) { return "\"" + id(name) + "\""; }
    private static String alias(Alias alias) {
        fields(alias, "name", "useAs"); return id(alias.getName());
    }
    /** Subconjunto lexical explícito; valores textuais seguem por binding, nunca interpolação. */
    private static String preflight(String sql) {
        if (sql == null || sql.isBlank() || sql.length() > 16000) throw reject("SIZE");
        boolean string = false; int depth = 0;
        for (int i=0; i<sql.length(); i++) {
            char c=sql.charAt(i);
            if (c=='\'') {
                if (string && i+1<sql.length() && sql.charAt(i+1)=='\'') { i++; continue; }
                string=!string; continue;
            }
            if (string) { if (c=='\\' || c==0) throw reject("STRING_SYNTAX"); continue; }
            if (c>127 || c=='"' || c=='`' || c=='$' || c=='?' || c=='\\') throw reject("LEXICAL");
            if (i+1<sql.length() && ((c=='-' && sql.charAt(i+1)=='-') || (c=='/' && sql.charAt(i+1)=='*'))) throw reject("COMMENTS");
            if (c==';' && !sql.substring(i+1).isBlank()) throw reject("MULTIPLE_STATEMENTS");
            if (c=='(' && ++depth>24) throw reject("DEPTH");
            if (c==')' && --depth<0) throw reject("DEPTH");
        }
        if (string || depth!=0) throw reject("LEXICAL");
        return sql;
    }
    /** Defesa fechada contra flags, dicas e extensões escondidas na mesma classe de AST.
     * Versão do parser fixada; campo novo não padrão é rejeitado, nunca ignorado. */
    private static void fields(Object node, String... allowed) {
        if (node == null) throw reject("MISSING_NODE");
        var names=Set.of(allowed);
        try {
            for (Class<?> type=node.getClass(); type!=null && type!=Object.class; type=type.getSuperclass()) {
                if (type.getSimpleName().equals("ASTNodeAccessImpl")) continue;
                for (var field:type.getDeclaredFields()) {
                    if (Modifier.isStatic(field.getModifiers()) || field.isSynthetic() || names.contains(field.getName())) continue;
                    field.setAccessible(true); Object value=field.get(node);
                    if (value==null || Boolean.FALSE.equals(value) || value instanceof Number n && n.doubleValue()==0 ||
                            value instanceof Collection<?> c && c.isEmpty() || value instanceof Enum<?> e && e.name().equals("NONE")) continue;
                    throw reject("UNSUPPORTED_CLAUSE");
                }
            }
        } catch (IllegalAccessException failure) { throw reject("UNSUPPORTED_CLAUSE"); }
    }
    private record Query(String sql, Set<String> columns) {}
    private final class Compiler {
        final Map<String, Binding> inputParameters=new LinkedHashMap<>(), bindings=new LinkedHashMap<>();
        final Set<String> usedParameters=new HashSet<>(), views=new HashSet<>();
        int nodes, selects, literals;
        Compiler(FinancialPlan plan) {
            if (plan.parameters()==null || plan.parameters().size()>20) throw reject("PARAMETERS");
            for (var parameter:plan.parameters()) {
                if (parameter==null || parameter.name()==null || !parameter.name().matches("[a-z][a-z0-9_]{0,39}") ||
                    Set.of("user_id","userid","tenant_id").contains(parameter.name()) || parameter.value()==null || parameter.value().length()>240 || inputParameters.containsKey(parameter.name())) throw reject("PARAMETERS");
                Object value=switch (parameter.type()) {
                    case "text" -> parameter.value();
                    case "date" -> LocalDate.parse(parameter.value());
                    case "timestamp" -> LocalDateTime.parse(parameter.value());
                    case "integer" -> integer(parameter.value());
                    case "decimal" -> decimal(parameter.value());
                    default -> throw reject("PARAMETER_TYPE");
                };
                inputParameters.put(parameter.name(),new Binding(parameter.type(),value));
            }
        }
        void budget(int depth) { if (++nodes>450 || depth>16) throw reject("COMPLEXITY"); }
        String literal(String type,Object value) {
            String name="__sql_lit_"+(literals++); bindings.put(name,new Binding(type,value)); return ":"+name;
        }
        Object integer(String value) {
            long number=Long.parseLong(value);
            if (number>=Integer.MIN_VALUE && number<=Integer.MAX_VALUE) return Integer.valueOf((int)number);
            return Long.valueOf(number);
        }
        BigDecimal decimal(String value) {
            var number=new BigDecimal(value);
            if (number.precision()>20 || Math.abs(number.scale())>8) throw reject("NUMBER"); return number;
        }
        Query select(Select select, Map<String,Query> inherited, int depth) { return select(select,inherited,depth,false); }
        Query select(Select select, Map<String,Query> inherited, int depth, boolean top) {
            budget(depth); if (++selects>8) throw reject("COMPLEXITY");
            var ctes=new LinkedHashMap<>(inherited); var with=new ArrayList<String>();
            if (select.getWithItemsList()!=null) {
                if (select.getWithItemsList().size()>4) throw reject("CTE");
                for (var item:select.getWithItemsList()) {
                    fields(item,"statement","alias");
                    String name=alias(item.getAlias());
                    if (ctes.containsKey(name) || catalog.columns().containsKey("assistant_finance."+name)) throw reject("CTE_SHADOW");
                    if (!(item.getStatement() instanceof ParenthesedSelect parent)) throw reject("CTE_SELECT_ONLY");
                    Query query=select(parent,ctes,depth+1); ctes.put(name,query); with.add(q(name)+" AS ("+query.sql()+")");
                }
            }
            Query body;
            if (select.getClass()==PlainSelect.class) body=plain((PlainSelect)select,ctes,depth+1,top);
            else if (select.getClass()==ParenthesedSelect.class) {
                var parent=(ParenthesedSelect)select; fields(parent,"select","alias","withItemsList"); body=select(parent.getSelect(),ctes,depth+1,top);
            } else if (select.getClass()==SetOperationList.class) {
                var set=(SetOperationList)select; fields(set,"selects","operations","orderByElements","limit","withItemsList");
                if (set.getSelects().size()>4 || set.getOperations().size()!=set.getSelects().size()-1) throw reject("UNION");
                for (var operation:set.getOperations()) if (operation.getClass()!=UnionOp.class || !((UnionOp)operation).isAll() || !operation.toString().equalsIgnoreCase("UNION ALL")) throw reject("UNION_ALL_ONLY");
                var queries=set.getSelects().stream().map(child->select(child,ctes,depth+1)).toList();
                if (queries.stream().anyMatch(child->child.columns().size()!=queries.getFirst().columns().size())) throw reject("UNION_COLUMNS");
                var scope=Map.of("",queries.getFirst().columns());
                String sql=queries.stream().map(child->"("+child.sql()+")").collect(Collectors.joining(" UNION ALL "));
                body=new Query(sql+order(set.getOrderByElements(),scope,queries.getFirst().columns(),depth+1)+limit(set.getLimit(),top),queries.getFirst().columns());
            } else throw reject("SELECT_SHAPE");
            return with.isEmpty()?body:new Query("WITH "+String.join(", ",with)+" "+body.sql(),body.columns());
        }
        Query plain(PlainSelect select, Map<String,Query> ctes,int depth, boolean top) {
            fields(select,"selectItems","fromItem","joins","where","groupBy","having","distinct","orderByElements","limit","withItemsList");
            var scope=new LinkedHashMap<String,Set<String>>(); String from=source(select.getFromItem(),ctes,scope,depth+1);
            var joins=new ArrayList<String>();
            if (select.getJoins()!=null) {
                if (select.getJoins().size()>1) throw reject("JOIN_LIMIT");
                for (var join:select.getJoins()) {
                    fields(join,"fromItem","onExpressions","inner","left","outer");
                    if (join.getOnExpressions().size()!=1 || !(join.getOnExpressions().iterator().next() instanceof EqualsTo equal) ||
                        !(equal.getLeftExpression() instanceof Column left) || !(equal.getRightExpression() instanceof Column right)) throw reject("JOIN_KEY");
                    Set<String> previous=Set.copyOf(scope.keySet());
                    String rightSql=source(join.getFromItem(),ctes,scope,depth+1);
                    String la=id(left.getTableName()),ra=id(right.getTableName());
                    if (la.equals(ra) || previous.contains(la)==previous.contains(ra) || !id(left.getColumnName()).equals(id(right.getColumnName())) || !id(left.getColumnName()).endsWith("_uuid")) throw reject("JOIN_KEY");
                    if (!allowedJoin(select.getFromItem(), join.getFromItem(), left, right)) throw reject("JOIN_RELATIONSHIP");
                    joins.add((join.isLeft()?" LEFT JOIN ":" INNER JOIN ")+rightSql+" ON "+expression(equal,scope,Set.of(),depth+1));
                }
            }
            if (select.getSelectItems()==null || select.getSelectItems().isEmpty() || select.getSelectItems().size()>24) throw reject("PROJECTION");
            var columns=new LinkedHashSet<String>(); var items=new ArrayList<String>();
            for (var item:select.getSelectItems()) {
                fields(item,"expression","alias"); String expr=expression(item.getExpression(),scope,Set.of(),depth+1);
                String name=item.getAlias()!=null?alias(item.getAlias()):item.getExpression() instanceof Column col?id(col.getColumnName()):"column_"+items.size();
                if (!columns.add(name)) throw reject("DUPLICATE_OUTPUT"); items.add(expr+" AS "+q(name));
            }
            String distinct=""; if (select.getDistinct()!=null) { fields(select.getDistinct()); distinct="DISTINCT "; }
            String sql="SELECT "+distinct+String.join(", ",items)+" FROM "+from+String.join("",joins);
            if (select.getWhere()!=null) sql+=" WHERE "+expression(select.getWhere(),scope,Set.of(),depth+1);
            if (select.getGroupBy()!=null) {
                fields(select.getGroupBy(),"groupByExpressions");
                if (select.getGroupBy().getGroupByExpressionList().stream().anyMatch(e->e instanceof LongValue || e instanceof DoubleValue)) throw reject("GROUP_ORDINAL");
                sql+=" GROUP BY "+expressions(select.getGroupBy().getGroupByExpressionList(),scope,columns,depth+1);
            }
            if (select.getHaving()!=null) sql+=" HAVING "+expression(select.getHaving(),scope,Set.of(),depth+1);
            return new Query(sql+order(select.getOrderByElements(),scope,columns,depth+1)+limit(select.getLimit(),top),Collections.unmodifiableSet(columns));
        }
        boolean allowedJoin(FromItem first,FromItem second,Column left,Column right) {
            if (!(first instanceof Table a) || !(second instanceof Table b)) return false;
            String av=a.getFullyQualifiedName().toLowerCase(Locale.ROOT),bv=b.getFullyQualifiedName().toLowerCase(Locale.ROOT);
            String aa=a.getAlias()==null?id(a.getName()):alias(a.getAlias());
            String ba=b.getAlias()==null?id(b.getName()):alias(b.getAlias());
            if (!Set.of(aa,ba).equals(Set.of(id(left.getTableName()),id(right.getTableName())))) return false;
            Set<String> pair=Set.of(av,bv);String key=id(left.getColumnName());
            return key.equals("account_uuid") && pair.equals(Set.of("assistant_finance.accounts","assistant_finance.transactions")) ||
                key.equals("card_uuid") && (pair.equals(Set.of("assistant_finance.cards","assistant_finance.purchases")) ||
                    pair.equals(Set.of("assistant_finance.cards","assistant_finance.invoices")) || pair.equals(Set.of("assistant_finance.cards","assistant_finance.installments"))) ||
                key.equals("purchase_uuid") && pair.equals(Set.of("assistant_finance.purchases","assistant_finance.installments")) ||
                key.equals("invoice_uuid") && pair.equals(Set.of("assistant_finance.invoices","assistant_finance.installments"));
        }
        String source(FromItem item,Map<String,Query> ctes,Map<String,Set<String>> scope,int depth) {
            budget(depth); String name; Set<String> columns; String sql;
            if (item!=null && item.getClass()==Table.class) {
                var table=(Table)item; fields(table,"partItems","partDelimiters","alias");
                String full=table.getFullyQualifiedName().toLowerCase(Locale.ROOT);
                if (ctes.containsKey(full)) { name=id(full);columns=ctes.get(full).columns();sql=q(name); }
                else {
                    columns=catalog.columns().get(full); if (columns==null) throw reject("VIEW_NOT_ALLOWED");
                    views.add(full);name=id(table.getName());sql=q("assistant_finance")+"."+q(name);
                }
                if (table.getAlias()!=null) name=alias(table.getAlias());
            } else if (item!=null && item.getClass()==ParenthesedSelect.class) {
                var parent=(ParenthesedSelect)item;
                if (parent.getAlias()==null) throw reject("DERIVED_ALIAS");
                name=alias(parent.getAlias());Query child=select(parent,ctes,depth+1);columns=child.columns();sql="("+child.sql()+")";
            } else throw reject("FROM_SOURCE");
            if (scope.putIfAbsent(name,columns)!=null) throw reject("SOURCE_ALIAS");return sql+" AS "+q(name);
        }
        String limit(Limit limit, boolean top) {
            if (limit==null) return top ? " LIMIT 100" : "";
            fields(limit,"rowCount");
            if (!(limit.getRowCount() instanceof LongValue value) || value.getValue()<1 || value.getValue()>100) throw reject("ROW_LIMIT");
            return " LIMIT "+value.getValue();
        }
        String order(List<OrderByElement> order,Map<String,Set<String>> scope,Set<String> aliases,int depth) {
            if (order==null || order.isEmpty()) return ""; if (order.size()>8) throw reject("SORT_LIMIT");
            var result=new ArrayList<String>();
            for (var item:order) {
                fields(item,"expression","asc","ascDescPresent","nullOrdering");
                if (item.getExpression() instanceof LongValue || item.getExpression() instanceof DoubleValue) throw reject("SORT_ORDINAL");
                result.add(expression(item.getExpression(),scope,aliases,depth+1)+(item.isAsc()?" ASC":" DESC")+
                    (item.getNullOrdering()==null?"":item.getNullOrdering()==OrderByElement.NullOrdering.NULLS_FIRST?" NULLS FIRST":" NULLS LAST"));
            }
            return " ORDER BY "+String.join(", ",result);
        }
        String expressions(Collection<? extends Expression> list,Map<String,Set<String>> scope,Set<String> aliases,int depth) {
            if (list==null || list.isEmpty() || list.size()>24) throw reject("EXPRESSION_LIST");
            return list.stream().map(e->expression(e,scope,aliases,depth+1)).collect(Collectors.joining(", "));
        }
        String expression(Expression expr,Map<String,Set<String>> scope,Set<String> aliases,int depth) {
            budget(depth); if (expr==null) throw reject("EXPRESSION"); Class<?> type=expr.getClass();
            if (type==Column.class) {
                var col=(Column)expr;fields(col,"table","columnName","tableDelimiter");
                if (!".".equals(col.getTableDelimiter())) throw reject("COLUMN");
                String name=id(col.getColumnName()),table=col.getTableName();
                if (table!=null && !table.isEmpty()) {
                    fields(col.getTable(),"partItems","partDelimiters");table=id(table);
                    if (!table.equals(col.getTable().getFullyQualifiedName().toLowerCase(Locale.ROOT)) || !scope.containsKey(table) || !scope.get(table).contains(name)) throw reject("COLUMN");
                    return q(table)+"."+q(name);
                }
                if (aliases.contains(name)) return q(name);
                var matches=scope.entrySet().stream().filter(e->e.getValue().contains(name)).toList();
                if (matches.size()!=1) throw reject("UNKNOWN_OR_AMBIGUOUS_COLUMN");
                return matches.getFirst().getKey().isEmpty()?q(name):q(matches.getFirst().getKey())+"."+q(name);
            }
            if (type==JdbcNamedParameter.class) {
                var parameter=(JdbcNamedParameter)expr;fields(parameter,"name","parameterCharacter");
                String name=parameter.getName(); Binding binding=inputParameters.get(name);
                if (binding==null || !expr.toString().equals(":"+name)) throw reject("PARAMETER");
                usedParameters.add(name);bindings.put(name,binding);return ":"+name;
            }
            if (type==StringValue.class) {
                var value=(StringValue)expr;fields(value,"value","quoteStr");
                if (!value.toString().startsWith("'") || value.getValue().length()>512) throw reject("STRING");
                return literal("text",value.getValue().replace("''","'"));
            }
            if (type==LongValue.class) { fields(expr,"stringValue");return literal("integer",integer(Long.toString(((LongValue)expr).getValue()))); }
            if (type==DoubleValue.class) { fields(expr,"value","stringValue");return literal("decimal",decimal(expr.toString())); }
            if (type==BooleanValue.class) { fields(expr,"value");return ((BooleanValue)expr).getValue()?"TRUE":"FALSE"; }
            if (type==NullValue.class) { fields(expr);return "NULL"; }
            if (expr instanceof ParenthesedExpressionList<?> list && list.size()==1) return "("+expression(list.getFirst(),scope,aliases,depth+1)+")";
            if (type==SignedExpression.class) {
                var signed=(SignedExpression)expr;fields(signed,"sign","expression");
                if (signed.getSign()!='-' && signed.getSign()!='+') throw reject("SIGN");
                return "("+signed.getSign()+expression(signed.getExpression(),scope,aliases,depth+1)+")";
            }
            if (type==NotExpression.class) { var not=(NotExpression)expr;fields(not,"expression");return "(NOT "+expression(not.getExpression(),scope,aliases,depth+1)+")"; }
            var operators=Map.<Class<?>,String>ofEntries(Map.entry(Addition.class,"+"),Map.entry(Subtraction.class,"-"),Map.entry(Multiplication.class,"*"),Map.entry(Division.class,"/"),Map.entry(Modulo.class,"%"),Map.entry(AndExpression.class,"AND"),Map.entry(OrExpression.class,"OR"),Map.entry(EqualsTo.class,"="),Map.entry(NotEqualsTo.class,"<>"),Map.entry(GreaterThan.class,">"),Map.entry(GreaterThanEquals.class,">="),Map.entry(MinorThan.class,"<"),Map.entry(MinorThanEquals.class,"<="));
            if (operators.containsKey(type)) {
                fields(expr,"leftExpression","rightExpression","operator"); var binary=(BinaryExpression)expr;
                return "("+expression(binary.getLeftExpression(),scope,aliases,depth+1)+" "+operators.get(type)+" "+expression(binary.getRightExpression(),scope,aliases,depth+1)+")";
            }
            if (type==LikeExpression.class) {
                var like=(LikeExpression)expr;fields(like,"leftExpression","rightExpression","not","likeKeyWord");
                if (!Set.of("LIKE","ILIKE").contains(like.getLikeKeyWord().name())) throw reject("LIKE");
                return "("+expression(like.getLeftExpression(),scope,aliases,depth+1)+(like.isNot()?" NOT":"")+" "+like.getLikeKeyWord().name()+" "+expression(like.getRightExpression(),scope,aliases,depth+1)+")";
            }
            if (type==IsNullExpression.class) { var n=(IsNullExpression)expr;fields(n,"leftExpression","not");return "("+expression(n.getLeftExpression(),scope,aliases,depth+1)+" IS "+(n.isNot()?"NOT ":"")+"NULL)"; }
            if (type==Between.class) { var b=(Between)expr;fields(b,"leftExpression","betweenExpressionStart","betweenExpressionEnd","not");return "("+expression(b.getLeftExpression(),scope,aliases,depth+1)+(b.isNot()?" NOT":"")+" BETWEEN "+expression(b.getBetweenExpressionStart(),scope,aliases,depth+1)+" AND "+expression(b.getBetweenExpressionEnd(),scope,aliases,depth+1)+")"; }
            if (type==InExpression.class) {
                var in=(InExpression)expr;fields(in,"leftExpression","rightExpression","not");
                if (!(in.getRightExpression() instanceof ExpressionList<?> values) || values.size()>20) throw reject("IN_LIST");
                return "("+expression(in.getLeftExpression(),scope,aliases,depth+1)+(in.isNot()?" NOT":"")+" IN ("+expressions(values,scope,aliases,depth+1)+"))";
            }
            if (type==ExtractExpression.class) {
                var extract=(ExtractExpression)expr;fields(extract,"name","expression");String part=extract.getName().toUpperCase(Locale.ROOT);
                if (!Set.of("YEAR","MONTH","DAY","DOW","ISODOW","WEEK","QUARTER","HOUR").contains(part)) throw reject("EXTRACT");
                return "EXTRACT("+part+" FROM "+expression(extract.getExpression(),scope,aliases,depth+1)+")";
            }
            if (type==CastExpression.class) {
                var cast=(CastExpression)expr;fields(cast,"leftExpression","colDataType","keyword","isImplicitCast");
                if (cast.keyword != null && !cast.keyword.equalsIgnoreCase("CAST")) throw reject("CAST_KIND");
                var data=cast.getColDataType();fields(data,"dataType");String name=data.getDataType().toLowerCase(Locale.ROOT);
                var types=Map.of("numeric","numeric","decimal","numeric","date","date","timestamp","timestamp","text","text","integer","int4","bigint","int8","boolean","bool");
                if (!types.containsKey(name)) throw reject("CAST_TYPE");
                return "CAST("+expression(cast.getLeftExpression(),scope,aliases,depth+1)+" AS pg_catalog."+types.get(name)+")";
            }
            if (type==TrimFunction.class) {
                var trim=(TrimFunction)expr; fields(trim,"expression");
                return "pg_catalog.btrim("+expression(trim.getExpression(),scope,aliases,depth+1)+")";
            }
            if (type==Function.class) {
                var function=(Function)expr;fields(function,"nameparts","parameters","allColumns","distinct");
                String name=function.getName().toLowerCase(Locale.ROOT);if (name.startsWith("pg_catalog.")) name=name.substring(11);
                if (!Set.of("sum","avg","count","min","max","coalesce","nullif","round","abs","lower","upper","trim","length","date_trunc","to_char").contains(name)) throw reject("FUNCTION");
                List<? extends Expression> args=function.getParameters()==null?List.of():function.getParameters();
                if (args.size()>8) throw reject("FUNCTION_ARITY");
                if (function.isAllColumns() || args.size()==1 && args.getFirst().getClass()==AllColumns.class) {
                    if (!name.equals("count") || function.isDistinct() || args.size()>1 || !args.isEmpty() && args.getFirst().getClass()!=AllColumns.class) throw reject("STAR");
                    if (!args.isEmpty()) fields(args.getFirst());
                    return "pg_catalog.count(*)";
                }
                int min=Set.of("coalesce","nullif","date_trunc","to_char").contains(name)?2:1;
                int max=name.equals("coalesce")?8:name.equals("round")?2:min;
                if (args.size()<min || args.size()>max || function.isDistinct() && !Set.of("sum","avg","count","min","max").contains(name)) throw reject("FUNCTION_ARITY");
                return (Set.of("coalesce","nullif").contains(name)?name.toUpperCase(Locale.ROOT):"pg_catalog."+(name.equals("trim")?"btrim":name))+"("+(function.isDistinct()?"DISTINCT ":"")+expressions(args,scope,aliases,depth+1)+")";
            }
            if (type==CaseExpression.class) {
                var c=(CaseExpression)expr;fields(c,"switchExpression","whenClauses","elseExpression","usingBrackets");
                if (c.getWhenClauses()==null || c.getWhenClauses().size()>8) throw reject("CASE");
                String sql="CASE"+(c.getSwitchExpression()==null?"":" "+expression(c.getSwitchExpression(),scope,aliases,depth+1));
                for (var when:c.getWhenClauses()) { fields(when,"whenExpression","thenExpression");sql+=" WHEN "+expression(when.getWhenExpression(),scope,aliases,depth+1)+" THEN "+expression(when.getThenExpression(),scope,aliases,depth+1); }
                return sql+(c.getElseExpression()==null?"":" ELSE "+expression(c.getElseExpression(),scope,aliases,depth+1))+" END";
            }
            throw reject("EXPRESSION_NOT_ALLOWED");
        }
    }
}
