package com.vikash_api.services;

import com.vikash_api.assistant.AssistantGeminiClient;
import com.vikash_api.assistant.AssistantAnswerClient;
import com.vikash_api.assistant.AssistantFamilyDebts;
import com.vikash_api.exceptions.AssistantAnswerException;
import com.vikash_api.assistant.AssistantSqlValidator;
import com.vikash_api.assistant.FinancialPlan;
import com.vikash_api.exceptions.AssistantSqlRejectedException;
import com.vikash_api.exceptions.AssistantQueryException;
import com.vikash_api.assistant.AssistantQueryExecutor;
import com.vikash_api.dtos.requests.AssistantMessageRequest;
import com.vikash_api.dtos.responses.AssistantMessageResponse;
import com.vikash_api.repositories.DebtRepository;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service @RequiredArgsConstructor
public class AssistantService {
    private final AssistantQuestionService questions;
    private final AssistantPlanningStore store;
    private final AssistantGeminiClient gemini;
    private final AiUsageService usage;
    private final AssistantSqlValidator validator;
    private final AssistantQueryExecutor executor;
    private final AssistantAnswerClient answers;
    private final DebtRepository debts;
    private final AssistantFamilyDebts familyDebts;
    // Configurado por ambiente; ativado localmente com autorização explícita.
    @Value("${assistant.planning.enabled:false}") private boolean enabled = false;
    public record Result(AssistantMessageResponse response, boolean replayed) {}
    // Sem transação: nenhuma chamada externa segura locks do banco.
    public Result ask(AssistantMessageRequest request, String key) {
        var accepted = questions.receive(request, key);
        if (!enabled) return new Result(accepted.response(), accepted.replayed());
        var id = accepted.response().message().id();
        var cached = store.completed(id, accepted.userId());
        if (cached.isPresent()) return new Result(cached.get(), true);
        try (var permit = usage.acquire(accepted.userId())) {
            var claim = store.claim(id, accepted.userId());
            if (claim.cached() != null) return new Result(claim.cached(), true);
            FinancialPlan plan = null;
            AssistantSqlValidator.ValidatedSql validated = null;
            try {
                var localPlan = executor.isEnabled() && answers.isEnabled() ? familyDebts.planFor(claim.question(),claim.history()) : null;
                if (claim.pendingAnswer() != null && (localPlan==null || localPlan.equals(claim.pendingAnswer().plan()))) {
                    var answer = localPlan==null ? answers.answer(claim.pendingAnswer()) : familyDebts.answer(claim.pendingAnswer());
                    return new Result(store.completeAnswer(id,accepted.userId(),claim.token(),answer),accepted.replayed());
                }
                com.vikash_api.assistant.AssistantMemory.Update memoryUpdate=null;
                if(localPlan!=null) plan=localPlan;
                else if(claim.memory()!=null) {
                    var turn=gemini.planWithMemory(claim.question(),claim.history(),ZonedDateTime.now(ZoneId.of("America/Sao_Paulo")),claim.memory());
                    plan=turn.plan();memoryUpdate=turn.memoryUpdate();
                }else plan=gemini.plan(claim.question(),claim.history(),ZonedDateTime.now(ZoneId.of("America/Sao_Paulo")));
                validated = plan.decision() == FinancialPlan.Decision.query ? validator.validate(plan) : null;
                if(claim.memory()!=null && localPlan==null)store.saveMemory(id,accepted.userId(),claim.token(),claim.memory(),memoryUpdate,plan);
                var result = validated != null && executor.isEnabled() ? execute(plan,validated,accepted.userId()) : null;
                if (result != null && answers.isEnabled()) {
                    var input=store.stageAnswer(id,accepted.userId(),claim.token(),plan,validated,result);
                    var answer = localPlan==null ? answers.answer(input) : familyDebts.answer(input);
                    return new Result(store.completeAnswer(id,accepted.userId(),claim.token(),answer),accepted.replayed());
                }
                return new Result(store.complete(id, accepted.userId(), claim.token(), plan, validated, result), accepted.replayed());
            } catch (AssistantAnswerException failure) {
                store.answerFailed(id,accepted.userId(),claim.token(),failure.getReason());throw failure;
            } catch (AssistantQueryException failure) {
                store.queryFailed(id, accepted.userId(), claim.token(), plan, failure.getReason()); throw failure;
            } catch (AssistantSqlRejectedException failure) {
                store.rejected(id, accepted.userId(), claim.token(), plan, failure.getReason()); throw failure;
            } catch (RuntimeException failure) {
                store.failed(id, accepted.userId(), claim.token()); throw failure;
            }
        }
    }

    private AssistantQueryExecutor.QueryResult execute(FinancialPlan plan, AssistantSqlValidator.ValidatedSql validated, Long userId) {
        if (plan.debtMatchCriterion()==null) return executor.execute(plan,validated);
        var candidates = new ArrayList<AssistantGeminiClient.DebtCandidate>();
        var ids = new ArrayList<UUID>();
        for (var debt : debts.findByUserIdOrderByIdDesc(userId)) {
            candidates.add(new AssistantGeminiClient.DebtCandidate(ids.size(), debt.getCreditor(), debt.getDescription()));
            ids.add(debt.getUuid());
        }
        var matches = candidates.isEmpty() ? List.<Integer>of() : gemini.matchDebts(plan.debtMatchCriterion(),candidates);
        return executor.execute(plan,validated,matches.stream().map(ids::get).toList());
    }
}
