package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.util.List;

public record DashboardResponse(
        BigDecimal totalBalance,
        BigDecimal incomes,
        BigDecimal expenses,
        BigDecimal incomesPercentageChange,
        BigDecimal expensesPercentageChange,
        List<CategoryExpenseResponse> expensesPerCategory,
        List<BalanceEvolutionResponse> balanceEvolution,
        AllAccountsResponse accounts,
        AllCreditCardsResponse creditCards,
        List<TransactionSummaryResponse> recentTransactions
) {

}
