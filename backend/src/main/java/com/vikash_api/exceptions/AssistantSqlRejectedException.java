package com.vikash_api.exceptions;

/** Motivo é um código fixo, nunca texto/SQL recebido do modelo. */
public class AssistantSqlRejectedException extends RuntimeException {
    private final String reason;
    public AssistantSqlRejectedException(String reason) {
        super("Não foi possível preparar uma consulta dentro das regras de segurança. Tente reformular sua pergunta.");
        this.reason = reason;
    }
    public String getReason() { return reason; }
}
