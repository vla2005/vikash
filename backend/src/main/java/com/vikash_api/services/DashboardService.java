package com.vikash_api.services;

import com.vikash_api.dtos.responses.*;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.repositories.AccountRepository;
import com.vikash_api.repositories.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final AuthenticatedUserService authenticatedUserService;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final CreditCardService creditCardService;
    private final AccountService accountService;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(int month, int year){
        UserEntity currentUser = authenticatedUserService.getCurrentUser();

        BigDecimal totalBalance = getTotalBalance(currentUser);
        TransactionTotalsResponse totals = getTotalIncomesAndExpenses(currentUser, month, year);
        List<CategoryExpenseResponse> expensesPerCategory = getExpensesByCategory(currentUser, month, year);
        AllAccountsResponse accounts = accountService.get();
        AllCreditCardsResponse creditCards = creditCardService.get();
        List<TransactionSummaryResponse> recentTransactions = getRecentTransactions(currentUser);
        return new DashboardResponse(
                totalBalance,
                totals.incomes(),
                totals.expenses(),
                totals.incomesPercentageChange(),
                totals.expensesPercentageChange(),
                expensesPerCategory,
                getLast7DaysEvolutionBalance(currentUser, totalBalance),
                accounts,
                creditCards,
                recentTransactions
        );

    }

    private BigDecimal getTotalBalance(UserEntity currentUser){
        return accountRepository.sumBalance(currentUser.getId());
    }

    private TransactionTotalsResponse getTotalIncomesAndExpenses(UserEntity currentUser, int month, int year){
        YearMonth period = YearMonth.of(year, month);
        LocalDateTime start = period.atDay(1).atStartOfDay();
        LocalDateTime end = period.plusMonths(1).atDay(1).atStartOfDay();

        TransactionTotalsResponse totals = transactionRepository.sumTotalsByUserAndPeriod(currentUser.getId(), start, end);
        YearMonth previousPeriod = period.minusMonths(1);
        LocalDateTime previousStart = previousPeriod.atDay(1).atStartOfDay();
        LocalDateTime previousEnd = start;
        TransactionTotalsResponse comparisonTotals = totals;

        LocalDate today = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        if (period.equals(YearMonth.from(today))) {
            // Compara até hoje, incluindo o dia inteiro, sem usar dias futuros do mês anterior.
            LocalDateTime comparisonEnd = today.plusDays(1).atStartOfDay();
            comparisonTotals = transactionRepository.sumTotalsByUserAndPeriod(currentUser.getId(), start, comparisonEnd);
            int previousDay = Math.min(today.getDayOfMonth(), previousPeriod.lengthOfMonth());
            previousEnd = previousPeriod.atDay(previousDay).plusDays(1).atStartOfDay();
        }

        TransactionTotalsResponse previousTotals = transactionRepository.sumTotalsByUserAndPeriod(
                currentUser.getId(), previousStart, previousEnd);

        return new TransactionTotalsResponse(totals.incomes(), totals.expenses(),
                percentageChange(comparisonTotals.incomes(), previousTotals.incomes()),
                percentageChange(comparisonTotals.expenses(), previousTotals.expenses()));
    }

    private BigDecimal percentageChange(BigDecimal current, BigDecimal previous) {
        if (previous.signum() == 0) { return null; }
        return current.subtract(previous)
                .multiply(BigDecimal.valueOf(100))
                .divide(previous, 1, RoundingMode.HALF_UP);
    }

    private List<CategoryExpenseResponse> getExpensesByCategory(UserEntity currentUser, int month, int year){
        YearMonth period = YearMonth.of(year, month);

        LocalDateTime start = period.atDay(1).atStartOfDay();
        LocalDateTime end = period.plusMonths(1).atDay(1).atStartOfDay();

        return transactionRepository.sumExpensesByCategory(currentUser.getId(), start, end).stream()
                .sorted(Comparator.comparing(CategoryExpenseResponse::total).reversed())
                .toList();
    }

    private List<BalanceEvolutionResponse> getLast7DaysEvolutionBalance(UserEntity currentUser, BigDecimal totalBalance) {
        LocalDate today = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        LocalDate firstDay = today.minusDays(6);
        Map<LocalDate, DailyTransactionTotalsResponse> dailyTotals = transactionRepository
                .sumDailyTotalsByUserAndPeriod(currentUser.getId(), firstDay.atStartOfDay(), today.plusDays(1).atStartOfDay())
                .stream().collect(Collectors.toMap(DailyTransactionTotalsResponse::date, totals -> totals));

        List<BalanceEvolutionResponse> evolution = new ArrayList<>();
        BigDecimal balance = totalBalance;
        for (int day = 0; day < 7; day++) {
            LocalDate date = today.minusDays(day);
            evolution.add(0, new BalanceEvolutionResponse(date, balance));
            DailyTransactionTotalsResponse totals = dailyTotals.get(date);
            if (totals != null) {
                // Desfaz as entradas e saídas para encontrar o saldo ao final do dia anterior.
                balance = balance.subtract(totals.incomes()).add(totals.expenses());
            }
        }
        return evolution;
    }

    private List<TransactionSummaryResponse> getRecentTransactions(UserEntity currentUser){
        return transactionRepository.findSummariesByUserId(
                currentUser.getId(),
                PageRequest.of(0,5)
        ).getContent();
    }
}
