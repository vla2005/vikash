package com.vikash_api.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.vikash_api.dtos.requests.CreditCardInvoiceRequest;
import com.vikash_api.entities.CreditCardEntity;
import com.vikash_api.entities.CreditCardInvoiceEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.enums.CreditCardInvoiceStatus;
import com.vikash_api.exceptions.CreditCardInvoiceAlreadyExistsException;
import com.vikash_api.exceptions.CreditCardInvoiceNotFoundException;
import com.vikash_api.exceptions.InvalidCreditCardInvoiceException;
import com.vikash_api.repositories.CreditCardInvoiceRepository;
import com.vikash_api.repositories.CreditCardRepository;
import com.vikash_api.services.AuthenticatedUserService;
import com.vikash_api.services.CreditCardInvoiceService;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreditCardInvoiceServiceTest {
    @Mock jakarta.persistence.EntityManager entityManager;
    @Mock AuthenticatedUserService authenticatedUserService;
    @Mock CreditCardInvoiceRepository creditCardInvoiceRepository;
    @Mock CreditCardRepository creditCardRepository;
    @Mock com.vikash_api.repositories.CreditCardInstallmentRepository creditCardInstallmentRepository;
    @InjectMocks CreditCardInvoiceService service;
    CreditCardEntity card;
    CreditCardInvoiceEntity invoice;

    @BeforeEach
    void setUp() {
        UserEntity user = new UserEntity();
        user.setId(7L);
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        card = new CreditCardEntity();
        card.setId(10L);
        card.setUuid(UUID.randomUUID());
        card.setLastFourDigits(32);
        invoice = new CreditCardInvoiceEntity();
        invoice.setUuid(UUID.randomUUID());
        invoice.setCreditCard(card);
    }

    CreditCardInvoiceRequest request() {
        return new CreditCardInvoiceRequest(card.getUuid(), " 2026-10 ", LocalDate.of(2026, 9, 30), LocalDate.of(2026, 10, 10));
    }

    @Test
    void createsOpenInvoiceForOwnedCardAndReturnsUuid() {
        when(creditCardRepository.findOwnedForUpdate(card.getUuid(), 7L)).thenReturn(Optional.of(card));
        when(creditCardInvoiceRepository.saveAndFlush(any())).thenAnswer(call -> {
            CreditCardInvoiceEntity saved = call.getArgument(0);
            saved.setUuid(invoice.getUuid());
            return saved;
        });
        when(creditCardInstallmentRepository.sumByInvoiceId(null)).thenReturn(java.math.BigDecimal.ZERO);
        var response = service.create(request());
        assertThat(response.uuid()).isEqualTo(invoice.getUuid());
        assertThat(response.creditCardUuid()).isEqualTo(card.getUuid());
        assertThat(response.status()).isEqualTo(CreditCardInvoiceStatus.OPEN);
        assertThat(response.referenceMonth()).isEqualTo("2026-10");
    }

    @Test
    void rejectsDuplicateMonthBeforeSaving() {
        when(creditCardRepository.findOwnedForUpdate(card.getUuid(), 7L)).thenReturn(Optional.of(card));
        when(creditCardInvoiceRepository.existsByCreditCardIdAndReferenceMonth(10L, "2026-10")).thenReturn(true);
        assertThatThrownBy(() -> service.create(request())).isInstanceOf(CreditCardInvoiceAlreadyExistsException.class);
        verify(creditCardInvoiceRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsForeignCardAndForeignInvoiceUsingScopedLookups() {
        assertThatThrownBy(() -> service.create(request())).isInstanceOf(CreditCardInvoiceNotFoundException.class);
        assertThatThrownBy(() -> service.getByUuid(invoice.getUuid())).isInstanceOf(CreditCardInvoiceNotFoundException.class);
        assertThatThrownBy(() -> service.update(invoice.getUuid(), request())).isInstanceOf(CreditCardInvoiceNotFoundException.class);
        verify(creditCardRepository).findOwnedForUpdate(card.getUuid(), 7L);
        verify(creditCardInvoiceRepository, times(2)).findByUuidAndCreditCardUserId(invoice.getUuid(), 7L);
        verify(creditCardInvoiceRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsArchivedCardAndInconsistentDates() {
        when(creditCardRepository.findOwnedForUpdate(card.getUuid(), 7L)).thenReturn(Optional.of(card));
        card.setActive(false);
        assertThatThrownBy(() -> service.create(request())).isInstanceOf(InvalidCreditCardInvoiceException.class);
        card.setActive(true);
        assertThatThrownBy(() -> service.create(new CreditCardInvoiceRequest(card.getUuid(), "2026-10", LocalDate.of(2026, 10, 11), LocalDate.of(2026, 10, 10))))
                .isInstanceOf(InvalidCreditCardInvoiceException.class);
        assertThatThrownBy(() -> service.create(new CreditCardInvoiceRequest(card.getUuid(), "2026-11", request().closingDate(), request().dueDate())))
                .isInstanceOf(InvalidCreditCardInvoiceException.class);
        verify(creditCardInvoiceRepository, never()).saveAndFlush(any());
    }

    @Test
    void listsOnlyCurrentUserInvoicesWithOptionalCardFilter() {
        when(creditCardInvoiceRepository.findByCreditCardUserIdOrderByDueDateDescIdDesc(7L)).thenReturn(List.of(invoice));
        assertThat(service.get(null).invoices()).hasSize(1);
        when(creditCardRepository.findByUuidAndUserId(card.getUuid(), 7L)).thenReturn(Optional.of(card));
        when(creditCardInvoiceRepository.findByCreditCardUuidAndCreditCardUserIdOrderByDueDateDescIdDesc(card.getUuid(), 7L)).thenReturn(List.of(invoice));
        assertThat(service.get(card.getUuid()).invoices()).hasSize(1);
    }

    @Test
    void updatesOpenInvoiceWithoutTreatingItAsDuplicateAndRejectsClosedInvoice() {
        when(creditCardInvoiceRepository.findByUuidAndCreditCardUserId(invoice.getUuid(), 7L)).thenReturn(Optional.of(invoice));
        when(creditCardRepository.findOwnedForUpdate(card.getUuid(), 7L)).thenReturn(Optional.of(card));
        when(creditCardInvoiceRepository.saveAndFlush(invoice)).thenReturn(invoice);
        when(creditCardInstallmentRepository.sumByInvoiceId(null)).thenReturn(java.math.BigDecimal.ZERO);
        assertThat(service.update(invoice.getUuid(), request()).dueDate()).isEqualTo(request().dueDate());
        verify(creditCardInvoiceRepository).existsByCreditCardIdAndReferenceMonthAndUuidNot(10L, "2026-10", invoice.getUuid());
        invoice.setStatus(CreditCardInvoiceStatus.CLOSED);
        assertThatThrownBy(() -> service.update(invoice.getUuid(), request())).isInstanceOf(InvalidCreditCardInvoiceException.class);
        verify(creditCardInvoiceRepository, times(1)).saveAndFlush(any());
    }

    @Test
    void purchaseBeforeClosingCreatesInvoiceAndNextPurchaseReusesIt() {
        card.setClosingDay(3);
        card.setDueDay(10);
        when(creditCardRepository.findOwnedForUpdate(card.getUuid(), 7L)).thenReturn(Optional.of(card));
        when(creditCardInvoiceRepository.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        var created = service.getOrCreateForPurchase(card.getUuid(), LocalDate.of(2026, 10, 2));
        assertThat(created.getReferenceMonth()).isEqualTo("2026-10");
        assertThat(created.getClosingDate()).isEqualTo(LocalDate.of(2026, 10, 3));
        assertThat(created.getDueDate()).isEqualTo(LocalDate.of(2026, 10, 10));
        when(creditCardInvoiceRepository.findByCreditCardIdAndReferenceMonth(10L, "2026-10")).thenReturn(Optional.of(created));
        assertThat(service.getOrCreateForPurchase(card.getUuid(), LocalDate.of(2026, 10, 2))).isSameAs(created);
        verify(creditCardInvoiceRepository, times(1)).saveAndFlush(any());
    }

    @Test
    void closingDayAndLaterPurchasesEnterFollowingCycle() {
        card.setClosingDay(3);
        card.setDueDay(10);
        when(creditCardRepository.findOwnedForUpdate(card.getUuid(), 7L)).thenReturn(Optional.of(card));
        when(creditCardInvoiceRepository.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        for (int day : new int[] { 3, 4, 31 }) {
            var result = service.getOrCreateForPurchase(card.getUuid(), LocalDate.of(2026, 10, day));
            assertThat(result.getReferenceMonth()).isEqualTo("2026-11");
            assertThat(result.getClosingDate()).isEqualTo(LocalDate.of(2026, 11, 3));
        }
    }

    @Test
    void clampsDaysInFebruaryAndHandlesDueDateInFollowingYear() {
        card.setClosingDay(31);
        card.setDueDay(31);
        when(creditCardRepository.findOwnedForUpdate(card.getUuid(), 7L)).thenReturn(Optional.of(card));
        when(creditCardInvoiceRepository.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        var february = service.getOrCreateForPurchase(card.getUuid(), LocalDate.of(2028, 2, 28));
        assertThat(february.getClosingDate()).isEqualTo(LocalDate.of(2028, 2, 29));
        assertThat(february.getDueDate()).isEqualTo(LocalDate.of(2028, 3, 31));
        card.setClosingDay(20);
        card.setDueDay(5);
        var december = service.getOrCreateForPurchase(card.getUuid(), LocalDate.of(2026, 12, 10));
        assertThat(december.getReferenceMonth()).isEqualTo("2027-01");
        assertThat(december.getDueDate()).isEqualTo(LocalDate.of(2027, 1, 5));
    }

    @Test
    void rejectsClosedInvoiceInsteadOfCreatingDuplicateOrAddingPurchase() {
        card.setClosingDay(3);
        card.setDueDay(10);
        invoice.setClosingDate(LocalDate.of(2026, 10, 3));
        invoice.setStatus(CreditCardInvoiceStatus.CLOSED);
        when(creditCardRepository.findOwnedForUpdate(card.getUuid(), 7L)).thenReturn(Optional.of(card));
        when(creditCardInvoiceRepository.findByCreditCardIdAndReferenceMonth(10L, "2026-10")).thenReturn(Optional.of(invoice));
        assertThatThrownBy(() -> service.getOrCreateForPurchase(card.getUuid(), LocalDate.of(2026, 10, 2)))
                .isInstanceOf(InvalidCreditCardInvoiceException.class);
        verify(creditCardInvoiceRepository, never()).saveAndFlush(any());
    }
}
