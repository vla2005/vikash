package com.vikash_api.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.vikash_api.dtos.responses.TransactionTotalsResponse;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.repositories.AccountRepository;
import com.vikash_api.repositories.TransactionRepository;
import com.vikash_api.services.AuthenticatedUserService;
import com.vikash_api.services.DashboardService;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {
    @Mock AuthenticatedUserService authenticatedUserService;
    @Mock AccountRepository accountRepository;
    @Mock TransactionRepository transactionRepository;
    @InjectMocks DashboardService service;
    UserEntity user;

    @BeforeEach
    void setup() {
        user = new UserEntity();
        user.setId(7L);
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        when(accountRepository.sumBalance(user.getId())).thenReturn(new BigDecimal("2000"));
    }

    @Test
    void comparesCompletePastMonthsAndHandlesYearChange() {
        YearMonth period = YearMonth.of(LocalDate.now().getYear() - 1, 1);
        stubTotals(period, "1200", "2200", "1000", "2500");
        var response = service.getDashboard(period.getMonthValue(), period.getYear());
        assertThat(response.totalBalance()).isEqualByComparingTo("2000");
        assertThat(response.incomes()).isEqualByComparingTo("1200");
        assertThat(response.expenses()).isEqualByComparingTo("2200");
        assertThat(response.incomesPercentageChange()).isEqualByComparingTo("20.0");
        assertThat(response.expensesPercentageChange()).isEqualByComparingTo("-12.0");
    }

    @Test
    void currentMonthComparesOnlyThroughSameDayAndPreservesMonthlyTotals() {
        LocalDate today = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        YearMonth period = YearMonth.from(today);
        YearMonth previous = period.minusMonths(1);
        var start = period.atDay(1).atStartOfDay();
        var end = period.plusMonths(1).atDay(1).atStartOfDay();
        var comparisonEnd = today.plusDays(1).atStartOfDay();
        var previousEnd = previous.atDay(Math.min(today.getDayOfMonth(), previous.lengthOfMonth()))
                .plusDays(1).atStartOfDay();
        if (comparisonEnd.equals(end)) {
            when(transactionRepository.sumTotalsByUserAndPeriod(user.getId(), start, end)).thenReturn(totals("500", "100"));
        } else {
            when(transactionRepository.sumTotalsByUserAndPeriod(user.getId(), start, end)).thenReturn(totals("900", "400"));
            when(transactionRepository.sumTotalsByUserAndPeriod(user.getId(), start, comparisonEnd)).thenReturn(totals("500", "100"));
        }
        when(transactionRepository.sumTotalsByUserAndPeriod(user.getId(), previous.atDay(1).atStartOfDay(), previousEnd))
                .thenReturn(totals("250", "200"));
        var response = service.getDashboard(period.getMonthValue(), period.getYear());
        assertThat(response.incomes()).isEqualByComparingTo(comparisonEnd.equals(end) ? "500" : "900");
        assertThat(response.incomesPercentageChange()).isEqualByComparingTo("100.0");
        assertThat(response.expensesPercentageChange()).isEqualByComparingTo("-50.0");
    }

    @Test
    void zeroPreviousTotalsHaveNoPercentageComparison() {
        YearMonth period = YearMonth.now().minusMonths(2);
        stubTotals(period, "100", "0", "0", "0");
        var response = service.getDashboard(period.getMonthValue(), period.getYear());
        assertThat(response.incomesPercentageChange()).isNull();
        assertThat(response.expensesPercentageChange()).isNull();
    }

    @Test
    void zeroCurrentAmountMeansFullDropAndUnchangedAmountMeansZeroVariation() {
        YearMonth period = YearMonth.now().minusMonths(2);
        stubTotals(period, "0", "300", "100", "300");
        var response = service.getDashboard(period.getMonthValue(), period.getYear());
        assertThat(response.incomesPercentageChange()).isEqualByComparingTo("-100.0");
        assertThat(response.expensesPercentageChange()).isEqualByComparingTo("0.0");
    }

    private void stubTotals(YearMonth period, String incomes, String expenses, String previousIncomes, String previousExpenses) {
        var start = period.atDay(1).atStartOfDay();
        when(transactionRepository.sumTotalsByUserAndPeriod(user.getId(), start, period.plusMonths(1).atDay(1).atStartOfDay()))
                .thenReturn(totals(incomes, expenses));
        when(transactionRepository.sumTotalsByUserAndPeriod(user.getId(), period.minusMonths(1).atDay(1).atStartOfDay(), start))
                .thenReturn(totals(previousIncomes, previousExpenses));
    }

    private TransactionTotalsResponse totals(String incomes, String expenses) {
        return new TransactionTotalsResponse(new BigDecimal(incomes), new BigDecimal(expenses));
    }

    @Test
    void reconstructsSevenDailyBalancesFromCurrentBalanceAndKeepsDaysWithoutTransactions() {
        LocalDate today = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        YearMonth period = YearMonth.from(today).minusMonths(2);
        stubTotals(period, "0", "0", "0", "0");
        when(transactionRepository.sumDailyTotalsByUserAndPeriod(user.getId(),
                today.minusDays(6).atStartOfDay(), today.plusDays(1).atStartOfDay())).thenReturn(java.util.List.of(
                    new com.vikash_api.dtos.responses.DailyTransactionTotalsResponse(today, new BigDecimal("500"), new BigDecimal("200")),
                    new com.vikash_api.dtos.responses.DailyTransactionTotalsResponse(today.minusDays(2), BigDecimal.ZERO, new BigDecimal("100"))));

        var evolution = service.getDashboard(period.getMonthValue(), period.getYear()).balanceEvolution();
        assertThat(evolution).hasSize(7);
        assertThat(evolution.getFirst().date()).isEqualTo(today.minusDays(6));
        assertThat(evolution.getLast().date()).isEqualTo(today);
        assertThat(evolution.stream().map(row -> row.balance().intValue()).toList())
                .containsExactly(1800, 1800, 1800, 1800, 1700, 1700, 2000);
    }

    @Test
    void returnsSevenEqualBalancesWhenThereAreNoCashMovements() {
        YearMonth period = YearMonth.now().minusMonths(2);
        stubTotals(period, "0", "0", "0", "0");
        var evolution = service.getDashboard(period.getMonthValue(), period.getYear()).balanceEvolution();
        assertThat(evolution).hasSize(7).allSatisfy(row -> assertThat(row.balance()).isEqualByComparingTo("2000"));
    }
}
