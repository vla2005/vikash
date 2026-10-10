package com.vikash_api.dtos.responses;

import java.math.BigDecimal;
import java.util.List;

public record CreditDashboardResponse(
        BigDecimal purchasesTotal,
        long purchaseCount,
        BigDecimal invoicesTotal,
        List<CreditMonthlyPurchasesResponse> monthlyPurchases,
        List<CategoryExpenseResponse> expensesPerCategory,
        List<CreditDashboardInvoiceResponse> upcomingInvoices,
        List<CreditPurchaseSummaryResponse> recentPurchases
) {}
