package com.vikash_api.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import com.vikash_api.dtos.responses.CreditCardPurchaseResponse;
import com.vikash_api.dtos.responses.CreditCardReferenceResponse;
import com.vikash_api.dtos.responses.FinancialInstitutionResponse;
import com.vikash_api.dtos.responses.CategoryResponse;
import com.vikash_api.exceptions.TransactionNotFoundException;
import com.vikash_api.dtos.responses.AiAnalysisResponse;
import com.vikash_api.entities.CreditCardInvoiceEntity;
import com.vikash_api.entities.CreditCardPurchaseEntity;
import com.vikash_api.entities.CreditCardInstallmentEntity;
import com.vikash_api.entities.DefaultCategoriesEntity;
import com.vikash_api.entities.CustomCategoryEntity;
import com.vikash_api.repositories.CreditCardPurchaseRepository;
import com.vikash_api.repositories.CreditCardInstallmentRepository;
import com.vikash_api.repositories.CreditCardRepository;
import com.vikash_api.enums.CreditCardInvoiceStatus;
import com.vikash_api.exceptions.InvalidTransactionException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CreditCardPurchaseService {
    private final CreditCardPurchaseRepository creditCardPurchaseRepository;
    private final CreditCardInstallmentRepository creditCardInstallmentRepository;
    private final CreditCardInvoiceService creditCardInvoiceService;
    private final AuthenticatedUserService authenticatedUserService;
    private final CreditCardRepository creditCardRepository;

    @Transactional
    public void delete(UUID uuid) {
        Long userId = authenticatedUserService.getCurrentUser().getId();
        var purchase = creditCardPurchaseRepository.findOwnedForUpdate(uuid, userId)
                .orElseThrow(() -> new TransactionNotFoundException("Compra no crédito não encontrada."));
        // Pagamentos, distribuição e exclusões do mesmo cartão ficam serializados.
        creditCardRepository.findOwnedForUpdate(purchase.getCreditCard().getUuid(), userId)
                .orElseThrow(() -> new TransactionNotFoundException("Cartão não encontrado."));
        purchase = creditCardPurchaseRepository.findByUuidAndCreditCardUserId(uuid, userId)
                .orElseThrow(() -> new TransactionNotFoundException("Compra no crédito não encontrada."));
        var installments = creditCardInstallmentRepository.findByPurchaseId(purchase.getId());
        if (installments.stream().anyMatch(item -> item.getCreditCardInvoice().getStatus() == CreditCardInvoiceStatus.PAID)) {
            throw new InvalidTransactionException("Esta compra tem parcelas em faturas pagas. Exclua o pagamento dessas faturas antes de excluir a compra.");
        }
        // O limite e os totais são calculados pelas parcelas; os valores iniciais permanecem.
        creditCardInstallmentRepository.deleteAll(installments);
        creditCardInstallmentRepository.flush();
        creditCardPurchaseRepository.delete(purchase);
    }

    @Transactional(readOnly = true)
    public CreditCardPurchaseResponse getByUuid(UUID uuid) {
        var user = authenticatedUserService.getCurrentUser();
        var purchase = creditCardPurchaseRepository.findByUuidAndCreditCardUserId(uuid, user.getId())
                .orElseThrow(() -> new TransactionNotFoundException("Compra no crédito não encontrada."));
        var card = purchase.getCreditCard();
        var institution = card.getFinancialInstitution();
        var cardResponse = new CreditCardReferenceResponse(card.getUuid(), card.getDescription(),
                new FinancialInstitutionResponse(institution.getId(), institution.getName(), institution.getLogoUrl()));
        CategoryResponse category = null;
        if (purchase.getCustomCategory() != null) {
            var custom = purchase.getCustomCategory();
            category = new CategoryResponse(custom.getUuid(), custom.getName(), custom.getIcon(), custom.getColor());
        } else if (purchase.getDefaultCategory() != null) {
            var defaults = purchase.getDefaultCategory();
            category = new CategoryResponse(null, defaults.getName(), defaults.getIcon(), defaults.getColor());
        }
        return new CreditCardPurchaseResponse(purchase.getUuid(), purchase.getDescription(), purchase.getAmount(),
                purchase.getOccurredAt(), cardResponse, category, purchase.getTranscription(), purchase.getInstallmentCount(),
                creditCardInstallmentRepository.findDetailsByPurchase(uuid, user.getId()),
                purchase.getCreatedAt(), purchase.getUpdatedAt());
    }

    @Transactional
    public void create(AiAnalysisResponse analysis, DefaultCategoriesEntity defaultCategory,
            CustomCategoryEntity customCategory, String transcription) {
        CreditCardInvoiceEntity firstInvoice = creditCardInvoiceService.getOrCreateForPurchase(
                analysis.creditCardUuid(), analysis.occurredAt().toLocalDate());
        CreditCardPurchaseEntity purchase = new CreditCardPurchaseEntity();
        purchase.setCreditCard(firstInvoice.getCreditCard());
        purchase.setDescription(analysis.description());
        purchase.setAmount(analysis.amount().setScale(2));
        purchase.setInstallmentCount(analysis.installmentCount());
        purchase.setDefaultCategory(defaultCategory);
        purchase.setCustomCategory(customCategory);
        purchase.setOccurredAt(analysis.occurredAt());
        purchase.setTranscription(transcription);
        CreditCardPurchaseEntity saved = creditCardPurchaseRepository.save(purchase);
        createInstallments(saved, firstInvoice);
    }

    void createInstallments(CreditCardPurchaseEntity purchase, CreditCardInvoiceEntity firstInvoice) {
        int count = purchase.getInstallmentCount();
        BigDecimal amount = purchase.getAmount().divide(BigDecimal.valueOf(count), 2, RoundingMode.DOWN);
        int remainingCents = purchase.getAmount().subtract(amount.multiply(BigDecimal.valueOf(count)))
                .movePointRight(2).intValueExact();
        for (int number = 1; number <= count; number++) {
            CreditCardInvoiceEntity invoice = number == 1 ? firstInvoice
                    : creditCardInvoiceService.getOrCreateForInstallment(purchase.getCreditCard().getUuid(),
                            purchase.getOccurredAt().toLocalDate(), number);
            CreditCardInstallmentEntity installment = new CreditCardInstallmentEntity();
            installment.setPurchase(purchase);
            installment.setCreditCardInvoice(invoice);
            installment.setInstallmentNumber(number);
            // Os centavos restantes são distribuídos nas últimas parcelas.
            installment.setAmount(number > count - remainingCents ? amount.add(new BigDecimal("0.01")) : amount);
            creditCardInstallmentRepository.save(installment);
        }
    }

    void updateInstallmentAmounts(CreditCardPurchaseEntity purchase, java.util.List<CreditCardInstallmentEntity> installments) {
        int count = purchase.getInstallmentCount();
        BigDecimal amount = purchase.getAmount().divide(BigDecimal.valueOf(count), 2, RoundingMode.DOWN);
        int remainingCents = purchase.getAmount().subtract(amount.multiply(BigDecimal.valueOf(count)))
                .movePointRight(2).intValueExact();
        for (var installment : installments) {
            installment.setAmount(installment.getInstallmentNumber() > count - remainingCents
                    ? amount.add(new BigDecimal("0.01")) : amount);
        }
    }
}
