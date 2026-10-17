package com.vikash_api.services;

import com.vikash_api.assistant.AssistantGeminiClient;
import com.vikash_api.assistant.AssistantAnswerClient;
import com.vikash_api.exceptions.AssistantAnswerException;
import com.vikash_api.assistant.AssistantSqlValidator;
import com.vikash_api.assistant.FinancialPlan;
import com.vikash_api.exceptions.AssistantSqlRejectedException;
import com.vikash_api.exceptions.AssistantQueryException;
import com.vikash_api.assistant.AssistantQueryExecutor;
import com.vikash_api.dtos.requests.AssistantMessageRequest;
import com.vikash_api.dtos.responses.AssistantMessageResponse;
import java.time.ZoneId;
import java.time.ZonedDateTime;
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
                if (claim.pendingAnswer() != null) return new Result(store.completeAnswer(id,accepted.userId(),claim.token(),answers.answer(claim.pendingAnswer())),accepted.replayed());
                com.vikash_api.assistant.AssistantMemory.Update memoryUpdate=null;
                if(claim.memory()!=null) {
                    var turn=gemini.planWithMemory(claim.question(),claim.history(),ZonedDateTime.now(ZoneId.of("America/Sao_Paulo")),claim.memory());
                    plan=turn.plan();memoryUpdate=turn.memoryUpdate();
                }else plan=gemini.plan(claim.question(),claim.history(),ZonedDateTime.now(ZoneId.of("America/Sao_Paulo")));
                validated = plan.decision() == FinancialPlan.Decision.query ? validator.validate(plan) : null;
                if(claim.memory()!=null)store.saveMemory(id,accepted.userId(),claim.token(),claim.memory(),memoryUpdate,plan);
                var result = validated != null && executor.isEnabled() ? executor.execute(plan,validated) : null;
                if (result != null && answers.isEnabled()) {
                    var input=store.stageAnswer(id,accepted.userId(),claim.token(),plan,validated,result);
                    return new Result(store.completeAnswer(id,accepted.userId(),claim.token(),answers.answer(input)),accepted.replayed());
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
}
