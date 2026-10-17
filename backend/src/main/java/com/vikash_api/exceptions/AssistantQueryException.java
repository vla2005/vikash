package com.vikash_api.exceptions;
public class AssistantQueryException extends RuntimeException {
    private final String reason;
    public AssistantQueryException(String reason) { this(reason,null); }
    public AssistantQueryException(String reason,Throwable cause) {
        super(switch (reason) {
            case "COST_LIMIT" -> "A consulta ficou ampla demais. Tente limitar o período ou os filtros.";
            case "TIME_LIMIT" -> "A consulta ultrapassou o tempo permitido. Tente um período menor.";
            case "RESULT_LIMIT" -> "O resultado ficou grande demais. Tente uma pergunta mais específica.";
            default -> "Não foi possível consultar seus dados agora. Tente novamente.";
        },cause); this.reason=reason;
    }
    public String getReason() { return reason; }
}
