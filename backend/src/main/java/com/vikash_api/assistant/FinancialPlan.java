package com.vikash_api.assistant;

import java.util.List;

/** Proposta do modelo. Nenhum objeto deste tipo autoriza execução de SQL. */
public record FinancialPlan(String catalogVersion, Decision decision, String interpretation,
        String sql, List<Parameter> parameters, List<String> views, String clarification) {
    public enum Decision { query, clarify, unsupported }
    public record Parameter(String name, String type, String value) {}
    public record Turn(String role, String content) {}
}
