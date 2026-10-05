package com.vikash_api.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import com.vikash_api.dtos.responses.AiAnalysisResponse;
import com.vikash_api.dtos.responses.TransactionResponse;
import com.vikash_api.entities.CreditCardInvoiceEntity;
import com.vikash_api.entities.CreditCardPurchaseEntity;
import com.vikash_api.entities.CreditCardInstallmentEntity;
import com.vikash_api.entities.DefaultCategoriesEntity;
import com.vikash_api.entities.CustomCategoryEntity;
import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.enums.TransactionType;
import com.vikash_api.repositories.CreditCardPurchaseRepository;
import com.vikash_api.repositories.CreditCardInstallmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CreditCardPurchaseService {
    private final CreditCardPurchaseRepository creditCardPurchaseRepository;
    private final CreditCardInstallmentRepository creditCardInstallmentRepository;
    private final CreditCardInvoiceService creditCardInvoiceService;

    @Transactional
    public TransactionResponse create(AiAnalysisResponse analysis, DefaultCategoriesEntity defaultCategory,
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
        // Mantém o contrato do comando de voz; UUID e amount agora representam a compra inteira.
        return new TransactionResponse(saved.getUuid(), saved.getDescription(), saved.getAmount(),
                TransactionType.EXPENSE, PaymentMethod.CREDIT_CARD, saved.getOccurredAt(), null,
                saved.getCreditCard().getUuid(), firstInvoice.getUuid(), null,
                defaultCategory == null ? null : defaultCategory.getName(),
                customCategory == null ? null : customCategory.getUuid(), saved.getTranscription(),
                saved.getCreatedAt(), saved.getUpdatedAt(), saved.getUuid(), saved.getAmount(),
                null, saved.getInstallmentCount());
    }

    private void createInstallments(CreditCardPurchaseEntity purchase, CreditCardInvoiceEntity firstInvoice) {
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
}
