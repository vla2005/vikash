package com.vikash_api.service;

import java.math.BigDecimal;
import java.util.Optional;

import com.vikash_api.dtos.requests.CreateAccountRequest;
import com.vikash_api.entities.AccountEntity;
import com.vikash_api.entities.FinancialInstitutionEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.enums.AccountType;
import com.vikash_api.exceptions.FinancialInstitutionNotFoundException;
import com.vikash_api.exceptions.InvalidAccountException;
import com.vikash_api.repositories.AccountRepository;
import com.vikash_api.repositories.InstitutionRepository;
import com.vikash_api.services.AuthenticatedUserService;
import com.vikash_api.services.CreateAccountService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreateAccountServiceTest {
    @Mock AccountRepository accountRepository;
    @Mock InstitutionRepository institutionRepository;
    @Mock AuthenticatedUserService authenticatedUserService;
    @InjectMocks CreateAccountService service;

    @ParameterizedTest
    @EnumSource(value = AccountType.class, names = "CARTEIRA", mode = EnumSource.Mode.EXCLUDE)
    void createsAccountWithInstitutionAndReturnsDto(AccountType type) {
        UserEntity user = new UserEntity();
        FinancialInstitutionEntity institution = new FinancialInstitutionEntity();
        ReflectionTestUtils.setField(institution, "id", 7L);
        ReflectionTestUtils.setField(institution, "name", "Itaú");
        ReflectionTestUtils.setField(institution, "logoUrl", "/images/financial-institutions/itau.webp");
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        when(institutionRepository.findById(7L)).thenReturn(Optional.of(institution));
        when(accountRepository.save(any(AccountEntity.class))).thenAnswer(invocation -> {
            AccountEntity account = invocation.getArgument(0);
            assertThat(account.getUser()).isSameAs(user);
            assertThat(account.getFinancialInstitution()).isSameAs(institution);
            assertThat(account.getActive()).isTrue();
            account.setId(10L);
            return account;
        });

        var response = service.createAccount(new CreateAccountRequest(type, 7L, "Conta principal", new BigDecimal("125.50")));

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.description()).isEqualTo("Conta principal");
        assertThat(response.type()).isEqualTo(type);
        assertThat(response.balance()).isEqualByComparingTo("125.50");
        assertThat(response.financialInstitution().id()).isEqualTo(7L);
        assertThat(response.financialInstitution().name()).isEqualTo("Itaú");
        assertThat(response.financialInstitution().logoUrl()).isEqualTo(institution.getLogoUrl());
    }

    @ParameterizedTest
    @EnumSource(AccountType.class)
    void acceptsAccountWithoutInstitutionAndDefaultsBalanceToZero(AccountType type) {
        when(authenticatedUserService.getCurrentUser()).thenReturn(new UserEntity());
        when(accountRepository.save(any(AccountEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.createAccount(new CreateAccountRequest(type, null, "Minha conta", null));

        assertThat(response.financialInstitution()).isNull();
        assertThat(response.balance()).isEqualByComparingTo(BigDecimal.ZERO);
        verifyNoInteractions(institutionRepository);
    }

    @Test
    void rejectsWalletWithInstitutionBeforeSaving() {
        assertThatThrownBy(() -> service.createAccount(new CreateAccountRequest(AccountType.CARTEIRA, 7L, "Carteira", BigDecimal.ZERO)))
                .isInstanceOf(InvalidAccountException.class);
        verifyNoInteractions(institutionRepository, accountRepository);
    }

    @Test
    void rejectsMissingInstitutionBeforeSaving() {
        when(institutionRepository.findById(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.createAccount(new CreateAccountRequest(AccountType.POUPANCA, 7L, "Reserva", BigDecimal.ZERO)))
                .isInstanceOf(FinancialInstitutionNotFoundException.class);
        verifyNoInteractions(accountRepository);
    }

    @Test
    void rejectsMissingTypeBeforeSaving() {
        assertThatThrownBy(() -> service.createAccount(new CreateAccountRequest(null, null, "Conta", BigDecimal.ZERO)))
                .isInstanceOf(InvalidAccountException.class);
        verifyNoInteractions(institutionRepository, accountRepository);
    }
}
