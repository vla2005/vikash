package com.vikash_api.exceptions;

public class AssistantPlanningException extends RuntimeException {
    public enum Reason { UNAVAILABLE, INVALID, CONTEXT_LIMIT, CONTEXT_CHANGED }
    private final Reason reason;

    public AssistantPlanningException(Reason reason) { this(reason, null); }

    public AssistantPlanningException(Reason reason, Throwable cause) {
        super(switch (reason) {
            case UNAVAILABLE -> "Sua pergunta foi salva. O Gemini está temporariamente indisponível. Tente novamente.";
            case INVALID -> "Sua pergunta foi salva, mas o Gemini não gerou uma consulta válida. Tente reformular.";
            case CONTEXT_LIMIT -> "O contexto da pergunta ficou grande demais. Tente uma pergunta mais específica.";
            case CONTEXT_CHANGED -> "O contexto da pergunta mudou. Tente novamente.";
        }, cause);
        this.reason = reason;
    }

    public Reason getReason() { return reason; }
}
