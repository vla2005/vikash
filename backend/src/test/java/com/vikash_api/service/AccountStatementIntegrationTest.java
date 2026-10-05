package com.vikash_api.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import com.vikash_api.entities.AccountEntity;
import com.vikash_api.entities.TransactionEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.enums.AccountType;
import com.vikash_api.enums.PaymentMethod;
import com.vikash_api.enums.TransactionType;
import com.vikash_api.exceptions.InvalidAccountException;
import com.vikash_api.repositories.AccountRepository;
import com.vikash_api.repositories.TransactionRepository;
import com.vikash_api.repositories.UserRepository;
import com.vikash_api.services.AccountService;
import com.vikash_api.services.AuthenticatedUserService;
import com.vikash_api.services.AiAnalysisService;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:account-statement;DB_CLOSE_DELAY=-1")
@Transactional
class AccountStatementIntegrationTest {
    @Autowired AccountService service;
    @Autowired AccountRepository accountRepository;
    @Autowired UserRepository userRepository;
    @Autowired TransactionRepository transactionRepository;
    @MockitoBean AuthenticatedUserService authenticatedUserService;
    @MockitoBean AiAnalysisService aiAnalysisService;
    UserEntity user;
    AccountEntity wallet;
    AccountEntity otherAccount;

    @BeforeEach
    void setup() {
        user = userRepository.save(UserEntity.builder().name("Teste").email("account-detail@test.local").password("test-only").build());
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        wallet = account("Dinheiro");
        otherAccount = account("Outra carteira");
    }

    AccountEntity account(String description) {
        var account = new AccountEntity();
        account.setUser(user);
        account.setDescription(description);
        account.setType(AccountType.CARTEIRA);
        account.setBalance(new BigDecimal("2000"));
        account.setActive(true);
        return accountRepository.saveAndFlush(account);
    }

    void transaction(AccountEntity origin, AccountEntity destination, int minute) {
        var transaction = new TransactionEntity();
        transaction.setUser(user);
        transaction.setAccount(origin);
        transaction.setDestinationAccount(destination);
        transaction.setDescription("Compra " + minute);
        transaction.setAmount(new BigDecimal("10"));
        transaction.setType(destination == null ? TransactionType.EXPENSE : TransactionType.TRANSFER);
        transaction.setPaymentMethod(PaymentMethod.CASH);
        transaction.setOccurredAt(LocalDateTime.of(2026, 10, 4, 13, minute));
        transaction.setTranscription("Texto de teste");
        transactionRepository.save(transaction);
    }

    @Test
    void statementIncludesIncomingTransfersAndPaginatesOnlySelectedAccount() {
        for (int minute = 0; minute < 21; minute++) { transaction(wallet, null, minute); }
        transaction(otherAccount, wallet, 22);
        transaction(otherAccount, null, 23);
        transactionRepository.flush();
        var details = service.getByUuid(wallet.getUuid());
        assertThat(details.uuid()).isEqualTo(wallet.getUuid());
        assertThat(details.balance()).isEqualByComparingTo("2000");
        assertThat(details.financialInstitution()).isNull();
        var first = service.getTransactions(wallet.getUuid(), 0, 20);
        var last = service.getTransactions(wallet.getUuid(), 1, 20);
        assertThat(first.getContent()).hasSize(20).allSatisfy(row -> assertThat(row.institutionName()).isEqualTo("Carteira"));
        assertThat(first.hasNext()).isTrue();
        assertThat(first.getContent().getFirst().type()).isEqualTo(TransactionType.TRANSFER);
        assertThat(first.getContent().getFirst().description()).isEqualTo("Compra 22");
        assertThat(last.getContent()).hasSize(2);
        assertThat(last.hasNext()).isFalse();
        assertThat(first.getContent()).doesNotContainAnyElementsOf(last.getContent());
        assertThat(service.getTransactions(otherAccount.getUuid(), 0, 20).getContent()).hasSize(2);
        assertThat(service.getTransactions(account("Vazia").getUuid(), 0, 20)).isEmpty();
    }

    @Test
    void preventsReadingOtherUsersAccountsAndRejectsInvalidPagination() {
        assertThatThrownBy(() -> service.getTransactions(wallet.getUuid(), -1, 20)).isInstanceOf(InvalidAccountException.class);
        var other = userRepository.save(UserEntity.builder().name("Outro").email("foreign-account@test.local").password("test-only").build());
        when(authenticatedUserService.getCurrentUser()).thenReturn(other);
        assertThatThrownBy(() -> service.getByUuid(wallet.getUuid())).isInstanceOf(InvalidAccountException.class);
        assertThatThrownBy(() -> service.getTransactions(wallet.getUuid(), 0, 20)).isInstanceOf(InvalidAccountException.class);
        assertThatThrownBy(() -> service.getByUuid(UUID.randomUUID())).isInstanceOf(InvalidAccountException.class);
    }
}
