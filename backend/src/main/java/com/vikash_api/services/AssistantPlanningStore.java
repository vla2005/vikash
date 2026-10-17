package com.vikash_api.services;

import com.vikash_api.assistant.*;
import com.vikash_api.dtos.responses.AssistantMessageResponse;
import com.vikash_api.entities.AssistantMessageEntity;
import com.vikash_api.exceptions.*;
import com.vikash_api.repositories.AssistantMessageRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Slf4j @Service @RequiredArgsConstructor
public class AssistantPlanningStore {
    private final AssistantMessageRepository messages;
    private final ObjectMapper mapper;
    private final AssistantExecutionProperties execution;
    private final AssistantAnswerClient answers;
    private final AssistantSqlValidator validator;
    private final AssistantMemory memory;
    private final jakarta.persistence.EntityManager entityManager;
    @org.springframework.beans.factory.annotation.Value("${assistant.memory.enabled:false}") private boolean memoryEnabled=false;
    private static final Set<String> COMPLETE=Set.of("planned","queried","answered","clarification","unsupported");
    private static final Set<String> RUNNING=Set.of("planning","answering");
    public record Claim(UUID token,String question,List<FinancialPlan.Turn> history,AssistantMessageResponse cached,FinancialAnswerInput pendingAnswer,AssistantMemory.Context memory) {}
    @Transactional(readOnly=true)
    public Optional<AssistantMessageResponse> completed(UUID id,Long userId) {
        var question=owned(id,userId,false);
        return isComplete(question)?Optional.of(response(question,userId)):Optional.empty();
    }
    @Transactional
    public Claim claim(UUID id,Long userId) {
        var question=owned(id,userId,true);
        entityManager.refresh(question.getConversation(),jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if(isComplete(question))return new Claim(null,null,List.of(),response(question,userId),null,null);
        var cutoff=Instant.now().minusSeconds(90);
        boolean live=RUNNING.contains(question.getStatus()) && question.getPlanningStartedAt()!=null && question.getPlanningStartedAt().isAfter(cutoff);
        if(live || messages.existsByConversationIdAndStatusInAndPlanningStartedAtAfter(question.getConversation().getId(),RUNNING,cutoff))throw busy();
        boolean resume=answers.isEnabled() && validResult(question);
        question.setStatus(resume?"answering":"planning");question.setPlanningToken(UUID.randomUUID());question.setPlanningStartedAt(now());
        var history=history(question);
        var context=memoryEnabled?memoryContext(question):null;
        log.info("event=assistant.plan.claimed questionId={} historyTurns={} resumeAnswer={}",id,history.size(),resume);
        return new Claim(question.getPlanningToken(),question.getContent(),history,null,resume?answerInput(question,history):null,context);
    }
    private AssistantMemory.Context memoryContext(AssistantMessageEntity question) {
        var conversation=question.getConversation();var owner=conversation.getUser().getUuid();
        var state=memory.restore(question.getMemoryContextJson(),question.getMemoryContextHash(),owner,conversation.getUuid(),question.getId())
            .or(()->memory.restore(conversation.getMemoryJson(),conversation.getMemoryHash(),owner,conversation.getUuid(),question.getId()-1))
            .orElseGet(()->memory.empty(owner,conversation.getUuid()));
        var bootstrap=new ArrayList<String>();int bytes=0;boolean limited=false;
        if(state.revision()==0) {
            for(var previous:messages.findTop100ByConversationIdAndRoleAndIdLessThanOrderByIdAsc(conversation.getId(),"user",question.getId())) {
                if(!Set.of("planned","queried","answered","clarification").contains(previous.getStatus()))continue;
                int size=previous.getContent().getBytes(StandardCharsets.UTF_8).length;
                if(bytes+size>32000){limited=true;break;}
                bytes+=size;bootstrap.add(previous.getContent());
            }
        }
        if(question.getMemoryContextJson()==null || !memory.json(state).equals(question.getMemoryContextJson())) {
            question.setMemoryContextJson(memory.json(state));question.setMemoryContextHash(AssistantSqlValidator.fingerprint(question.getMemoryContextJson()));
        }
        return new AssistantMemory.Context(state,bootstrap,limited,history(question).stream().filter(turn->"user".equals(turn.role())).map(FinancialPlan.Turn::content).toList());
    }
    @Transactional
    public void saveMemory(UUID id,Long userId,UUID token,AssistantMemory.Context base,AssistantMemory.Update update,FinancialPlan plan) {
        if(!memoryEnabled || plan.decision()==FinancialPlan.Decision.unsupported)return;
        var question=owned(id,userId,true);checkLease(question,token);
        var conversation=question.getConversation();entityManager.refresh(conversation,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        var actual=memoryContext(question);
        if(base==null || !memory.hash(base).equals(memory.hash(actual)))throw new AssistantPlanningException("O contexto da pergunta mudou. Tente novamente.");
        var next=memory.apply(update,base,question.getContent(),question.getId(),now());
        question.setMemoryContextJson(memory.json(next));question.setMemoryContextHash(AssistantSqlValidator.fingerprint(question.getMemoryContextJson()));
        var current=memory.restore(conversation.getMemoryJson(),conversation.getMemoryHash(),conversation.getUser().getUuid(),conversation.getUuid(),Long.MAX_VALUE);
        if(current.isEmpty() || current.get().throughMessageId()<=question.getId() && current.get().revision()<=base.state().revision()) {
            conversation.setMemoryJson(memory.json(next));conversation.setMemoryHash(AssistantSqlValidator.fingerprint(conversation.getMemoryJson()));conversation.setMemoryUpdatedAt(next.updatedAt());
            log.info("event=assistant.memory.saved revision={} filterCount={} summaryChars={} memoryVersion={}",next.revision(),next.view().filters().size(),next.view().summary().length(),AssistantMemory.VERSION);
        }else log.info("event=assistant.memory.checkpoint.preserved reason=NEWER_CONTEXT memoryVersion={}",AssistantMemory.VERSION);
    }
    private AssistantMemory.View memoryView(AssistantMessageEntity question) {
        if(!memoryEnabled)return AssistantMemory.View.empty();
        return memory.restore(question.getMemoryContextJson(),question.getMemoryContextHash(),question.getConversation().getUser().getUuid(),question.getConversation().getUuid(),question.getId())
            .map(AssistantMemory.State::view).orElse(AssistantMemory.View.empty());
    }
    private List<FinancialPlan.Turn> history(AssistantMessageEntity question) {
        var history=new ArrayList<FinancialPlan.Turn>();int bytes=0;
        for(var message:messages.findTop12ByConversationIdAndIdLessThanOrderByIdDesc(question.getConversation().getId(),question.getId())) {
            if(!Set.of("user","assistant").contains(message.getRole()) || !Set.of("sent","planned","queried","answered","clarification","unsupported").contains(message.getStatus()))continue;
            int size=message.getContent().getBytes(StandardCharsets.UTF_8).length;
            if(bytes+size>24000)break;
            bytes+=size;history.add(new FinancialPlan.Turn(message.getRole(),message.getContent()));
        }
        Collections.reverse(history);return List.copyOf(history);
    }
    @Transactional
    public AssistantMessageResponse complete(UUID id,Long userId,UUID token,FinancialPlan plan,AssistantSqlValidator.ValidatedSql validated,AssistantQueryExecutor.QueryResult result) {
        var question=owned(id,userId,true);checkLease(question,token);checkProof(question,plan,validated,result);
        if(result!=null && answers.isEnabled())throw new AssistantAnswerException("INVALID");
        savePlan(question,plan,validated,result);
        String status=switch(plan.decision()){case query->result==null?"planned":"queried";case clarify->"clarification";case unsupported->"unsupported";};
        String text=switch(plan.decision()) {
            case query->result!=null?"Consulta concluída com segurança. A geração da resposta está desativada neste ambiente.":"Entendi sua pergunta e validei a consulta de acordo com as regras de segurança. Ainda não consultei seus dados: a execução será habilitada na próxima etapa.";
            case clarify->plan.clarification();
            case unsupported->"Não consigo responder a essa solicitação com os dados financeiros disponíveis no ViKash. Posso ajudar a consultar contas, gastos, compras, parcelas e faturas.";
        };
        return finish(question,userId,status,text);
    }
    @Transactional
    public FinancialAnswerInput stageAnswer(UUID id,Long userId,UUID token,FinancialPlan plan,AssistantSqlValidator.ValidatedSql validated,AssistantQueryExecutor.QueryResult result) {
        var question=owned(id,userId,true);checkLease(question,token);checkProof(question,plan,validated,result);
        if(!answers.isEnabled() || result==null)throw new AssistantAnswerException("INVALID");
        savePlan(question,plan,validated,result);
        question.setStatus("answering");question.setPlanningStartedAt(now());
        if(question.getReplyUuid()!=null)messages.findByUuidAndConversationUserId(question.getReplyUuid(),userId).ifPresent(reply->reply.setStatus("pending"));
        log.info("event=assistant.answer.staged questionId={} resultBytes={}",id,question.getQueryResultJson().getBytes(StandardCharsets.UTF_8).length);
        return answerInput(question,history(question));
    }
    @Transactional
    public AssistantMessageResponse completeAnswer(UUID id,Long userId,UUID token,AssistantAnswerFormatter.Answer answer) {
        var question=owned(id,userId,true);checkLease(question,token);
        if(!"answering".equals(question.getStatus()) || !validResult(question) || answer==null || !answer.matches(answerInput(question,history(question)),mapper))throw new AssistantAnswerException("INVALID");
        question.setAnswerVersion(AssistantAnswerFormatter.VERSION);question.setAnswerInputHash(answer.inputHash());
        String presentation=answer.presentation()==null?null:mapper.writeValueAsString(answer.presentation());
        question.setAnswerOutputHash(outputHash(answer.content(),presentation));question.setAnsweredAt(now());question.setAnswerFailureReason(null);
        return finish(question,userId,"answered",answer.content(),presentation);
    }
    private void checkLease(AssistantMessageEntity question,UUID token) {
        if(token==null || !token.equals(question.getPlanningToken()) || question.getPlanningStartedAt()==null || question.getPlanningStartedAt().isBefore(Instant.now().minusSeconds(90)))throw busy();
    }
    private void checkProof(AssistantMessageEntity question,FinancialPlan plan,AssistantSqlValidator.ValidatedSql validated,AssistantQueryExecutor.QueryResult result) {
        if(plan.decision()==FinancialPlan.Decision.query && (validated==null || !validated.matches(plan)))throw new AssistantSqlRejectedException("PROOF_REQUIRED");
        if((plan.decision()==FinancialPlan.Decision.query && execution.isEnabled() && result==null) || (result!=null && (validated==null || plan.decision()!=FinancialPlan.Decision.query || !result.belongsTo(question.getConversation().getUser().getUuid(),plan,validated.fingerprint()))))throw new AssistantQueryException("ISOLATION_GUARD");
    }
    private void savePlan(AssistantMessageEntity question,FinancialPlan plan,AssistantSqlValidator.ValidatedSql validated,AssistantQueryExecutor.QueryResult result) {
        String json=mapper.writeValueAsString(plan);
        if(json.length()>24000)throw new AssistantPlanningException("Proposta excedeu o limite de armazenamento.");
        question.setCatalogVersion(plan.catalogVersion());question.setProposalJson(json);clearValidation(question);
        if(validated!=null) {
            question.setSqlValidationVersion(AssistantSqlValidator.POLICY_VERSION);question.setValidatedSql(validated.sql());
            question.setSqlValidationHash(validated.fingerprint());question.setSqlValidatedAt(now());
        }
        if(result!=null) {
            String resultJson=mapper.writeValueAsString(result.snapshot());
            if(resultJson.getBytes(StandardCharsets.UTF_8).length>65536)throw new AssistantQueryException("RESULT_LIMIT");
            question.setQueryResultJson(resultJson);question.setQueryResultHash(AssistantSqlValidator.fingerprint(resultJson));
            question.setQueryExecutionVersion(AssistantQueryExecutor.VERSION);question.setQueryOwnerUuid(question.getConversation().getUser().getUuid());
            question.setQueryExecutedAt(Instant.parse((String)result.snapshot().get("executedAt")));
        }
        log.info("event=assistant.plan.saved questionId={} decision={} catalogVersion={} sqlValidated={} sqlExecuted={}",question.getUuid(),plan.decision(),plan.catalogVersion(),validated!=null,result!=null);
    }
    private FinancialAnswerInput answerInput(AssistantMessageEntity question,List<FinancialPlan.Turn> history) {
        if(!validResult(question))throw new AssistantAnswerException("INVALID");
        var plan=mapper.readValue(question.getProposalJson(),FinancialPlan.class);
        var proof=validator.validate(plan);
        if(!proof.sql().equals(question.getValidatedSql()) || !proof.fingerprint().equals(question.getSqlValidationHash()))throw new AssistantAnswerException("INVALID");
        return new FinancialAnswerInput(question.getConversation().getUser().getUuid(),question.getUuid(),question.getContent(),history,plan,question.getQueryResultJson(),memoryView(question));
    }
    private AssistantMessageResponse finish(AssistantMessageEntity question,Long userId,String status,String text) { return finish(question,userId,status,text,null); }
    private AssistantMessageResponse finish(AssistantMessageEntity question,Long userId,String status,String text,String presentation) {
        var reply=question.getReplyUuid()==null?new AssistantMessageEntity():messages.findByUuidAndConversationUserId(question.getReplyUuid(),userId)
            .filter(m->"assistant".equals(m.getRole()) && m.getConversation().getId().equals(question.getConversation().getId())).orElseThrow();
        if(reply.getUuid()==null)reply.setUuid(UUID.randomUUID());
        reply.setPresentationJson(presentation);
        reply.setClientId("reply-"+question.getUuid());reply.setConversation(question.getConversation());reply.setRole("assistant");reply.setContent(text);reply.setStatus("sent");
        if(reply.getCreatedAt()==null)reply.setCreatedAt(now());messages.save(reply);
        question.setStatus(status);question.setReplyUuid(reply.getUuid());question.setPlanningToken(null);question.setPlanningStartedAt(null);question.getConversation().setUpdatedAt(now());
        log.info("event=assistant.reply.saved questionId={} status={} outputChars={}",question.getUuid(),status,text.length());
        return response(question,userId);
    }
    private String outputHash(String content,String presentation) { return AssistantSqlValidator.fingerprint(content+(presentation==null?"":"\n"+presentation)); }
    private boolean isComplete(AssistantMessageEntity question) {
        if(!COMPLETE.contains(question.getStatus()))return false;
        if("answered".equals(question.getStatus())) {
            if(!validResult(question) || !Set.of(AssistantAnswerFormatter.VERSION,"financial-answer-v1").contains(question.getAnswerVersion()==null?"":question.getAnswerVersion()) || question.getAnsweredAt()==null || question.getAnswerInputHash()==null || question.getReplyUuid()==null)return false;
            return messages.findByUuidAndConversationUserId(question.getReplyUuid(),question.getConversation().getUser().getId())
                .filter(reply->"assistant".equals(reply.getRole()) && reply.getConversation().getId().equals(question.getConversation().getId()) && outputHash(reply.getContent(),reply.getPresentationJson()).equals(question.getAnswerOutputHash())).isPresent();
        }
        if("queried".equals(question.getStatus()))return !answers.isEnabled() && validResult(question);
        return !"planned".equals(question.getStatus()) || !execution.isEnabled() && validationCurrent(question);
    }
    private boolean validResult(AssistantMessageEntity question) {
        return AssistantQueryExecutor.VERSION.equals(question.getQueryExecutionVersion()) && question.getQueryExecutedAt()!=null && question.getQueryResultJson()!=null && question.getProposalJson()!=null &&
            question.getConversation().getUser().getUuid().equals(question.getQueryOwnerUuid()) && AssistantSqlValidator.fingerprint(question.getQueryResultJson()).equals(question.getQueryResultHash()) && validationCurrent(question);
    }
    private boolean validationCurrent(AssistantMessageEntity question) {
        return AssistantSqlValidator.POLICY_VERSION.equals(question.getSqlValidationVersion()) && question.getSqlValidatedAt()!=null && question.getValidatedSql()!=null && AssistantSqlValidator.fingerprint(question.getValidatedSql()).equals(question.getSqlValidationHash());
    }
    private void clearAnswer(AssistantMessageEntity question) {
        question.setAnswerVersion(null);question.setAnswerInputHash(null);question.setAnswerOutputHash(null);question.setAnsweredAt(null);question.setAnswerFailureReason(null);
    }
    private void clearResult(AssistantMessageEntity question) {
        clearAnswer(question);question.setQueryResultJson(null);question.setQueryResultHash(null);question.setQueryExecutionVersion(null);question.setQueryOwnerUuid(null);question.setQueryExecutedAt(null);question.setQueryFailureReason(null);
    }
    private void clearValidation(AssistantMessageEntity question) {
        clearResult(question);question.setValidatedSql(null);question.setSqlValidationHash(null);question.setSqlValidationVersion(null);question.setSqlValidatedAt(null);question.setSqlRejectionReason(null);
    }
    @Transactional
    public void answerFailed(UUID id,Long userId,UUID token,String reason) {
        var question=owned(id,userId,true);if(!token.equals(question.getPlanningToken()))return;
        clearAnswer(question);question.setAnswerFailureReason(reason);question.setStatus("answer_failed");question.setPlanningToken(null);question.setPlanningStartedAt(null);
        log.info("event=assistant.answer.retryable questionId={} reason={} resultPreserved={}",id,reason,validResult(question));
    }
    @Transactional
    public void rejected(UUID id,Long userId,UUID token,FinancialPlan plan,String reason) {
        var question=owned(id,userId,true);if(!token.equals(question.getPlanningToken()))return;
        clearValidation(question);saveFailedPlan(question,plan);question.setStatus("sql_rejected");question.setSqlRejectionReason(reason);question.setPlanningToken(null);question.setPlanningStartedAt(null);
        log.info("event=assistant.sql.blocked questionId={} reason={} sqlExecuted=false",id,reason);
    }
    private void saveFailedPlan(AssistantMessageEntity question,FinancialPlan plan) {
        if(plan!=null) { String json=mapper.writeValueAsString(plan);if(json.length()<=24000)question.setProposalJson(json);question.setCatalogVersion(plan.catalogVersion()); }
    }
    @Transactional
    public void queryFailed(UUID id,Long userId,UUID token,FinancialPlan plan,String reason) {
        var question=owned(id,userId,true);if(!token.equals(question.getPlanningToken()))return;
        clearResult(question);saveFailedPlan(question,plan);question.setStatus("query_failed");question.setQueryFailureReason(reason);question.setPlanningToken(null);question.setPlanningStartedAt(null);
        log.info("event=assistant.query.retryable questionId={} reason={}",id,reason);
    }
    @Transactional
    public void failed(UUID id,Long userId,UUID token) {
        var question=owned(id,userId,true);
        if(token.equals(question.getPlanningToken())) { question.setStatus("planning_failed");question.setPlanningToken(null);question.setPlanningStartedAt(null);log.info("event=assistant.plan.retryable questionId={}",id); }
    }
    private AssistantMessageEntity owned(UUID id,Long userId,boolean lock) {
        var found=lock?messages.findOwnedForUpdate(id,userId):messages.findByUuidAndConversationUserId(id,userId);
        return found.filter(m->"user".equals(m.getRole())).orElseThrow(()->new AssistantQuestionException(HttpStatus.NOT_FOUND,"ASSISTANT_CONVERSATION_NOT_FOUND","Conversa não encontrada."));
    }
    private AssistantQuestionException busy() { return new AssistantQuestionException(HttpStatus.CONFLICT,"ASSISTANT_PLANNING_IN_PROGRESS","Já existe uma pergunta sendo preparada nesta conversa. Aguarde e tente novamente."); }
    private Instant now() { return Instant.now().truncatedTo(ChronoUnit.MICROS); }
    private AssistantMessageResponse response(AssistantMessageEntity question,Long userId) {
        var reply=messages.findByUuidAndConversationUserId(question.getReplyUuid(),userId).filter(m->"assistant".equals(m.getRole()) && m.getConversation().getId().equals(question.getConversation().getId())).orElseThrow();
        return new AssistantMessageResponse(question.getConversation().getUuid(),question.getStatus(),new AssistantMessageResponse.Receipt(question.getUuid(),question.getClientId(),"user",question.getStatus(),question.getCreatedAt()),null,new AssistantMessageResponse.Reply(reply.getUuid(),"assistant",reply.getContent(),reply.getCreatedAt(),reply.getPresentationJson()==null?null:mapper.readValue(reply.getPresentationJson(),FinancialReplyPresentation.class)));
    }
}
