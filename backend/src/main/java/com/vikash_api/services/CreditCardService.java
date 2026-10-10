package com.vikash_api.services;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vikash_api.dtos.requests.CreditCardRequest;
import com.vikash_api.dtos.requests.CreditCardCreateRequest;
import com.vikash_api.dtos.responses.CreditCardDetailsResponse;
import com.vikash_api.dtos.responses.TransactionSummaryResponse;
import com.vikash_api.dtos.responses.FinancialInstitutionResponse;
import com.vikash_api.dtos.responses.AllCreditCardsResponse;
import com.vikash_api.dtos.responses.CreditCardSummaryResponse;
import com.vikash_api.dtos.responses.CreditCardInvoiceSummaryResponse;
import com.vikash_api.entities.CreditCardEntity;
import com.vikash_api.entities.FinancialInstitutionEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.enums.CreditCardInvoiceStatus;
import com.vikash_api.exceptions.CreditCardInvoiceNotFoundException;
import com.vikash_api.exceptions.InvalidCreditCardInvoiceException;
import com.vikash_api.exceptions.InvalidCreditCardSetupException;
import com.vikash_api.exceptions.FinancialInstitutionNotFoundException;
import com.vikash_api.repositories.CreditCardRepository;
import com.vikash_api.repositories.InstitutionRepository;
import com.vikash_api.repositories.CreditCardInvoiceRepository;
import com.vikash_api.repositories.CreditCardInstallmentRepository;
import com.vikash_api.repositories.projections.InvoiceAmountProjection;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CreditCardService {

    private final AuthenticatedUserService authenticatedUserService;
    private final CreditCardRepository creditCardRepository;
    private final InstitutionRepository institutionRepository;
    private final CreditCardInvoiceRepository creditCardInvoiceRepository;
    private final CreditCardInstallmentRepository creditCardInstallmentRepository;

    @Transactional(readOnly = true)
    public CreditCardDetailsResponse getByUuid(UUID uuid) {
        var user = authenticatedUserService.getCurrentUser();
        var card = creditCardRepository.findByUuidAndUserId(uuid, user.getId())
                .orElseThrow(() -> new CreditCardInvoiceNotFoundException("Cartão não encontrado."));
        var invoices = creditCardInvoiceRepository.findAmountsByCardUuidAndUserId(uuid, user.getId());
        var pending = invoices.stream().filter(invoice -> invoice.status() != CreditCardInvoiceStatus.PAID).toList();
        var used = pending.stream().map(InvoiceAmountProjection::total)
                .reduce(card.getUnallocatedUsedLimit(), BigDecimal::add);
        var allocatedInitial = invoices.stream().map(InvoiceAmountProjection::initialAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        var current = pending.stream().min(Comparator.comparing(InvoiceAmountProjection::dueDate));
        var institution = card.getFinancialInstitution();
        return new CreditCardDetailsResponse(card.getUuid(), card.getLastFourDigits(),
                card.getCreditLimit(), card.getCreditLimit().subtract(used), card.getClosingDay(), card.getDueDay(),
                new FinancialInstitutionResponse(institution.getId(), institution.getName(), institution.getLogoUrl()),
                current.map(InvoiceAmountProjection::uuid).orElse(null), invoices.stream().map(invoice ->
                    new CreditCardInvoiceSummaryResponse(invoice.uuid(), invoice.referenceMonth(), invoice.total(),
                            invoice.closingDate(), invoice.dueDate(), invoice.status(), invoice.initialAmount())).toList(),
                used, card.getUnallocatedUsedLimit(), allocatedInitial.add(card.getUnallocatedUsedLimit()), allocatedInitial);
    }

    @Transactional(readOnly = true)
    public Slice<TransactionSummaryResponse> getInvoiceTransactions(
            UUID cardUuid, UUID invoiceUuid, int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new InvalidCreditCardInvoiceException("Paginação inválida.");
        }
        var user = authenticatedUserService.getCurrentUser();
        if (!creditCardInvoiceRepository.existsByUuidAndCreditCardUuidAndCreditCardUserId(invoiceUuid, cardUuid, user.getId())) {
            throw new CreditCardInvoiceNotFoundException("Fatura não encontrada neste cartão.");
        }
        return creditCardInstallmentRepository.findSummariesByInvoice(user.getId(), cardUuid, invoiceUuid,
                PageRequest.of(page, size));
    }

    @Transactional(readOnly = true)
    public AllCreditCardsResponse get() {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        List<CreditCardEntity> cards = creditCardRepository.findByUserIdAndActiveTrue(currentUser.getId());
        var invoices = creditCardInvoiceRepository.findUnpaidAmountsByUserId(currentUser.getId());
        Map<Long, BigDecimal> usedLimits = invoices.stream().collect(Collectors.toMap(
                InvoiceAmountProjection::creditCardId, InvoiceAmountProjection::total, BigDecimal::add));
        Map<Long, InvoiceAmountProjection> currentInvoices = new HashMap<>();
        // A primeira fatura pendente por vencimento tem prioridade, incluindo atrasadas.
        invoices.forEach(invoice -> currentInvoices.putIfAbsent(invoice.creditCardId(), invoice));
        return new AllCreditCardsResponse(cards.stream().map(card -> {
            var institution = card.getFinancialInstitution();
            var current = currentInvoices.get(card.getId());
            var invoiceResponse = current == null ? null : new CreditCardInvoiceSummaryResponse(current.uuid(),
                    current.referenceMonth(), current.total(), current.closingDate(), current.dueDate(), current.status(),
                    current.initialAmount());
            var used = usedLimits.getOrDefault(card.getId(), BigDecimal.ZERO).add(card.getUnallocatedUsedLimit());
            return new CreditCardSummaryResponse(card.getUuid(), card.getLastFourDigits(), card.getCreditLimit(),
                    card.getCreditLimit().subtract(used),
                    card.getClosingDay(), card.getDueDay(),
                    new FinancialInstitutionResponse(institution.getId(), institution.getName(), institution.getLogoUrl()),
                    invoiceResponse, used, card.getUnallocatedUsedLimit());
        }).toList());
    }

    @Transactional
    public void update(UUID uuid, CreditCardRequest request) {
        var user = authenticatedUserService.getCurrentUser();
        var card = creditCardRepository.findOwnedForUpdate(uuid, user.getId())
                .orElseThrow(() -> new CreditCardInvoiceNotFoundException("Cartão não encontrado."));
        var institution = institutionRepository.findById(request.financialInstitutionId())
                .orElseThrow(() -> new InvalidCreditCardInvoiceException("Instituição financeira não encontrada."));
        card.setLastFourDigits(request.lastFourDigits());
        card.setCreditLimit(request.creditLimit());
        card.setClosingDay(request.closingDay());
        card.setDueDay(request.dueDay());
        card.setFinancialInstitution(institution);
        creditCardRepository.save(card);
    }

    @Transactional
    public void create(CreditCardCreateRequest request) {
        UserEntity currentUser = authenticatedUserService.getCurrentUser();
        BigDecimal availableLimit = request.availableLimit() == null ? request.creditLimit() : request.availableLimit();
        if (availableLimit.signum() < 0 || availableLimit.compareTo(request.creditLimit()) > 0) {
            throw new InvalidCreditCardSetupException("availableLimit", "O limite disponível deve estar entre zero e o limite total.");
        }

        FinancialInstitutionEntity institution = institutionRepository.findById(request.financialInstitutionId())
            .orElseThrow(() -> new FinancialInstitutionNotFoundException("Instituição financeira não encontrada."));

        CreditCardEntity creditCard = new CreditCardEntity();
        creditCard.setUser(currentUser);
        creditCard.setFinancialInstitution(institution);
        creditCard.setLastFourDigits(request.lastFourDigits());
        creditCard.setCreditLimit(request.creditLimit());
        creditCard.setUnallocatedUsedLimit(request.creditLimit().subtract(availableLimit));
        creditCard.setClosingDay(request.closingDay());
        creditCard.setDueDay(request.dueDay());
        creditCard.setActive(true);
        creditCardRepository.save(creditCard);
    }
}
