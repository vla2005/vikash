package com.vikash_api.assistant;
import java.util.List;
import java.util.UUID;
/** Criado apenas pelo store após conferir proprietário, resultado e SQL. Não é DTO HTTP. */
public record FinancialAnswerInput(UUID ownerUuid,UUID questionId,String question,List<FinancialPlan.Turn> history,
        FinancialPlan plan,String resultJson,AssistantMemory.View memory) {
    public FinancialAnswerInput(UUID ownerUuid,UUID questionId,String question,List<FinancialPlan.Turn> history,FinancialPlan plan,String resultJson) { this(ownerUuid,questionId,question,history,plan,resultJson,AssistantMemory.View.empty()); }
    public FinancialAnswerInput { history=List.copyOf(history);memory=memory==null?AssistantMemory.View.empty():memory; }
}
