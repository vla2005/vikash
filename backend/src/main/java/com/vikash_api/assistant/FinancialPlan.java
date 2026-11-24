package com.vikash_api.assistant;

import java.util.List;

/** Proposta do modelo. Nenhum objeto deste tipo autoriza execução de SQL. */
public record FinancialPlan(String catalogVersion, Decision decision, String interpretation,
        String sql, List<Parameter> parameters, List<String> views, String clarification, String debtMatchCriterion) {
    public FinancialPlan(String catalogVersion, Decision decision, String interpretation,
            String sql, List<Parameter> parameters, List<String> views, String clarification) {
        this(catalogVersion, decision, interpretation, sql, parameters, views, clarification, null);
    }

    static final String DEBT_VIEW = "assistant_finance.debt_installments";
    boolean validDebtMatch() {
        return debtMatchCriterion == null || decision == Decision.query && views != null && views.contains(DEBT_VIEW)
                && !debtMatchCriterion.isBlank() && debtMatchCriterion.length() <= 500;
    }

    public enum Decision { query, clarify, unsupported }
    public record Parameter(String name, String type, String value) {}
    public record Turn(String role, String content) {}
}
