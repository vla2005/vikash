package com.vikash_api.service;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import com.vikash_api.dtos.requests.CreditCardCreateRequest;
import com.vikash_api.dtos.requests.CreditCardRequest;
import com.vikash_api.entities.CreditCardEntity;
import com.vikash_api.entities.FinancialInstitutionEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.exceptions.InvalidCreditCardSetupException;
import com.vikash_api.repositories.*;
import com.vikash_api.services.AuthenticatedUserService;
import com.vikash_api.services.CreditCardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreditCardServiceTest {
    @Mock AuthenticatedUserService authenticatedUserService;
    @Mock CreditCardRepository creditCardRepository;
    @Mock InstitutionRepository institutionRepository;
    @Mock CreditCardInvoiceRepository creditCardInvoiceRepository;
    @Mock CreditCardInstallmentRepository creditCardInstallmentRepository;
    @InjectMocks CreditCardService service;
    UserEntity user;

    @BeforeEach
    void setUp() {
        user = new UserEntity();
        user.setId(7L);
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
    }

    CreditCardCreateRequest request(BigDecimal available) {
        return new CreditCardCreateRequest(1L, " Meu cartão ", new BigDecimal("5000"), 3, 10, available);
    }

    @Test
    void createsCardWithUnallocatedDebtWithoutCreatingInvoices() {
        when(institutionRepository.findById(1L)).thenReturn(Optional.of(new FinancialInstitutionEntity()));
        service.create(request(new BigDecimal("2800")));
        var captor = ArgumentCaptor.forClass(CreditCardEntity.class);
        verify(creditCardRepository).save(captor.capture());
        assertThat(captor.getValue().getUnallocatedUsedLimit()).isEqualByComparingTo("2200");
        assertThat(captor.getValue().getDescription()).isEqualTo("Meu cartão");
        verifyNoInteractions(creditCardInvoiceRepository, creditCardInstallmentRepository);
    }

    @Test
    void zeroAvailableLimitReservesTheEntireLimit() {
        when(institutionRepository.findById(1L)).thenReturn(Optional.of(new FinancialInstitutionEntity()));
        service.create(request(BigDecimal.ZERO));
        verify(creditCardRepository).save(argThat(card -> card.getUnallocatedUsedLimit().compareTo(new BigDecimal("5000")) == 0));
    }

    @Test
    void omittedAvailableLimitKeepsExistingAppRequestsCompatible() {
        when(institutionRepository.findById(1L)).thenReturn(Optional.of(new FinancialInstitutionEntity()));
        service.create(request(null));
        verify(creditCardRepository).save(argThat(card -> card.getUnallocatedUsedLimit().signum() == 0));
    }

    @Test
    void rejectsAvailableLimitOutsideTotalLimit() {
        for (String amount : new String[] { "-1", "5000.01" }) {
            assertThatThrownBy(() -> service.create(request(new BigDecimal(amount))))
                    .isInstanceOf(InvalidCreditCardSetupException.class);
        }
        verify(creditCardRepository, never()).save(any());
    }

    @Test
    void editingCardDoesNotResetItsInitialDebt() {
        var card = new CreditCardEntity();
        card.setUuid(UUID.randomUUID());
        card.setUnallocatedUsedLimit(new BigDecimal("2200"));
        when(creditCardRepository.findOwnedForUpdate(card.getUuid(), 7L)).thenReturn(Optional.of(card));
        when(institutionRepository.findById(1L)).thenReturn(Optional.of(new FinancialInstitutionEntity()));
        service.update(card.getUuid(), new CreditCardRequest(1L, "Outro nome", new BigDecimal("6000"), 4, 11));
        assertThat(card.getUnallocatedUsedLimit()).isEqualByComparingTo("2200");
    }
}
