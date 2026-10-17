package com.vikash_api.exceptions;
public class AssistantAnswerException extends RuntimeException {
    private final String reason;
    public AssistantAnswerException(String reason) { this(reason,null); }
    public AssistantAnswerException(String reason,Throwable cause) {
        super("CONTEXT_LIMIT".equals(reason) ? "O resultado ficou amplo demais para responder. Tente uma pergunta mais específica." :
            "A consulta foi salva, mas não foi possível gerar a resposta agora. Tente enviar novamente.",cause);
        this.reason=reason;
    }
    public String getReason() { return reason; }
}
