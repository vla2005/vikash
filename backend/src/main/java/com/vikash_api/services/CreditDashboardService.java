package com.vikash_api.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vikash_api.dtos.responses.CategoryResponse;
import com.vikash_api.dtos.responses.CreditCardReferenceResponse;
import com.vikash_api.dtos.responses.CreditDashboardInvoiceResponse;
import com.vikash_api.dtos.responses.CreditDashboardResponse;
import com.vikash_api.dtos.responses.CreditMonthlyPurchasesResponse;
import com.vikash_api.dtos.responses.CreditPurchaseSummaryResponse;
import com.vikash_api.dtos.responses.FinancialInstitutionResponse;
import com.vikash_api.entities.CreditCardEntity;
import com.vikash_api.entities.CreditCardPurchaseEntity;
import com.vikash_api.exceptions.CreditCardInvoiceNotFoundException;
import com.vikash_api.repositories.CreditCardInvoiceRepository;
import com.vikash_api.repositories.CreditCardPurchaseRepository;
import com.vikash_api.repositories.CreditCardRepository;
import com.vikash_api.repositories.projections.CreditDashboardInvoiceProjection;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CreditDashboardService {
    private final AuthenticatedUserService authenticatedUserService;
    private final CreditCardRepository creditCardRepository;
    private final CreditCardPurchaseRepository creditCardPurchaseRepository;
    private final CreditCardInvoiceRepository creditCardInvoiceRepository;

    @Transactional(readOnly = true)
    public CreditDashboardResponse get(int month, int year, UUID cardUuid) {
        Long userId = authenticatedUserService.getCurrentUser().getId();
        if (cardUuid != null) {
            creditCardRepository.findByUuidAndUserId(cardUuid, userId)
                    .orElseThrow(() -> new CreditCardInvoiceNotFoundException("Cartão não encontrado."));
        }

        YearMonth period = YearMonth.of(year, month);
        LocalDateTime start = period.atDay(1).atStartOfDay();
        LocalDateTime end = period.plusMonths(1).atDay(1).atStartOfDay();
        List<CreditMonthlyPurchasesResponse> history = getMonthlyPurchases(userId, cardUuid, period);
        CreditMonthlyPurchasesResponse selectedMonth = history.get(history.size() - 1);
        BigDecimal invoicesTotal = getInvoicesTotal(userId, cardUuid, period);
        var categories = creditCardPurchaseRepository.sumPurchasesByCategory(userId, cardUuid, start, end);
        var upcomingInvoices = getUpcomingInvoices(userId, cardUuid);
        var recentPurchases = getRecentPurchases(userId, cardUuid);

        return new CreditDashboardResponse(selectedMonth.total(), selectedMonth.purchaseCount(), invoicesTotal,
                history, categories, upcomingInvoices, recentPurchases);
    }

    private List<CreditMonthlyPurchasesResponse> getMonthlyPurchases(Long userId, UUID cardUuid, YearMonth period) {
        YearMonth firstMonth = period.minusMonths(5);
        var totals = creditCardPurchaseRepository.sumMonthlyPurchases(userId, cardUuid,
                firstMonth.atDay(1).atStartOfDay(), period.plusMonths(1).atDay(1).atStartOfDay());
        Map<YearMonth, CreditMonthlyPurchasesResponse> totalsByMonth = new HashMap<>();
        for (var total : totals) {
            YearMonth month = YearMonth.of(total.year(), total.month());
            totalsByMonth.put(month, new CreditMonthlyPurchasesResponse(month.toString(), total.total(), total.purchaseCount()));
        }

        List<CreditMonthlyPurchasesResponse> history = new ArrayList<>();
        for (int index = 0; index < 6; index++) {
            YearMonth month = firstMonth.plusMonths(index);
            history.add(totalsByMonth.getOrDefault(month,
                    new CreditMonthlyPurchasesResponse(month.toString(), BigDecimal.ZERO, 0)));
        }
        return history;
    }

    private BigDecimal getInvoicesTotal(Long userId, UUID cardUuid, YearMonth period) {
        // As faturas incluem parcelas e valores iniciais, mesmo quando já foram pagas.
        return creditCardInvoiceRepository.findDashboardMonthInvoices(userId, cardUuid, period.toString())
                .stream().map(CreditDashboardInvoiceProjection::total).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<CreditDashboardInvoiceResponse> getUpcomingInvoices(Long userId, UUID cardUuid) {
        // Pendências atuais não dependem do período histórico escolhido.
        return creditCardInvoiceRepository.findDashboardPendingInvoices(userId, cardUuid, PageRequest.of(0, 6))
                .stream().map(invoice -> new CreditDashboardInvoiceResponse(
                        invoice.uuid(), invoice.referenceMonth(), invoice.total(), invoice.dueDate(), invoice.status(),
                        new CreditCardReferenceResponse(invoice.creditCardUuid(), invoice.creditCardDescription(),
                                new FinancialInstitutionResponse(invoice.institutionId(), invoice.institutionName(),
                                        invoice.institutionLogoUrl())))).toList();
    }

    private List<CreditPurchaseSummaryResponse> getRecentPurchases(Long userId, UUID cardUuid) {
        return creditCardPurchaseRepository.findRecentPurchases(userId, cardUuid, PageRequest.of(0, 5))
                .stream().map(this::toPurchaseSummary).toList();
    }

    private CreditPurchaseSummaryResponse toPurchaseSummary(CreditCardPurchaseEntity purchase) {
        CategoryResponse category = null;
        if (purchase.getCustomCategory() != null) {
            var custom = purchase.getCustomCategory();
            category = new CategoryResponse(custom.getUuid(), custom.getName(), custom.getIcon(), custom.getColor());
        } else if (purchase.getDefaultCategory() != null) {
            var defaults = purchase.getDefaultCategory();
            category = new CategoryResponse(null, defaults.getName(), defaults.getIcon(), defaults.getColor());
        }
        return new CreditPurchaseSummaryResponse(purchase.getUuid(), purchase.getDescription(), purchase.getAmount(),
                purchase.getOccurredAt(), purchase.getInstallmentCount(), toCardReference(purchase.getCreditCard()), category);
    }

    private CreditCardReferenceResponse toCardReference(CreditCardEntity card) {
        var institution = card.getFinancialInstitution();
        return new CreditCardReferenceResponse(card.getUuid(), card.getDescription(),
                new FinancialInstitutionResponse(institution.getId(), institution.getName(), institution.getLogoUrl()));
    }
}
