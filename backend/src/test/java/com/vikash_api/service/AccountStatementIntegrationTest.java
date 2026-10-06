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
    @Autowired com.vikash_api.services.TransactionService transactionService;
    @Autowired jakarta.persistence.EntityManager entityManager;
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
    void transactionDetailsIncludeBothAccountsAndTranscriptionWithoutBalances() {
        transaction(wallet, otherAccount, 10);
        transactionRepository.flush();
        var saved = transactionRepository.findAll().getFirst();
        var response = transactionService.getByUuid(saved.getUuid());
        assertThat(response.uuid()).isEqualTo(saved.getUuid());
        assertThat(response.account().description()).isEqualTo("Dinheiro");
        assertThat(response.destinationAccount().uuid()).isEqualTo(otherAccount.getUuid());
        assertThat(response.transcription()).isEqualTo("Texto de teste");
        assertThat(response.category()).isNull();
        assertThat(response.creditCard()).isNull();
        assertThat(tools.jackson.databind.json.JsonMapper.builder().build().valueToTree(response).toString())
                .doesNotContain("balance");
        var other = userRepository.save(UserEntity.builder().name("Outro").email("transaction-foreign@test.local").password("test-only").build());
        when(authenticatedUserService.getCurrentUser()).thenReturn(other);
        assertThatThrownBy(() -> transactionService.getByUuid(saved.getUuid()))
                .isInstanceOf(com.vikash_api.exceptions.TransactionNotFoundException.class);
        assertThatThrownBy(() -> transactionService.getByUuid(UUID.randomUUID()))
                .isInstanceOf(com.vikash_api.exceptions.TransactionNotFoundException.class);
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

    @Test
    void cashIncomeAndExpensePersistBalancesAndLeaveOtherAccountsUntouched() {
        createFromVoice(TransactionType.INCOME, "150.25", wallet.getUuid(), null);
        createFromVoice(TransactionType.EXPENSE, "45.10", wallet.getUuid(), null);
        entityManager.flush();
        entityManager.clear();

        assertThat(accountRepository.findByUuid(wallet.getUuid()).orElseThrow().getBalance())
                .isEqualByComparingTo("2105.15");
        assertThat(accountRepository.findByUuid(otherAccount.getUuid()).orElseThrow().getBalance())
                .isEqualByComparingTo("2000.00");
        assertThat(transactionRepository.count()).isEqualTo(2);
    }

    @Test
    void transferMovesBalanceBetweenAccountsWithoutChangingTotal() {
        createFromVoice(TransactionType.TRANSFER, "300.50", wallet.getUuid(), otherAccount.getUuid());
        entityManager.flush();
        entityManager.clear();

        BigDecimal origin = accountRepository.findByUuid(wallet.getUuid()).orElseThrow().getBalance();
        BigDecimal destination = accountRepository.findByUuid(otherAccount.getUuid()).orElseThrow().getBalance();
        assertThat(origin).isEqualByComparingTo("1699.50");
        assertThat(destination).isEqualByComparingTo("2300.50");
        assertThat(origin.add(destination)).isEqualByComparingTo("4000.00");
        assertThat(transactionRepository.count()).isEqualTo(1);
    }

    @Test
    void foreignDestinationDoesNotChangeBalancesOrCreateTransaction() {
        var otherUser = userRepository.save(UserEntity.builder().name("Outro")
                .email("balance-foreign@test.local").password("test-only").build());
        otherAccount.setUser(otherUser);
        accountRepository.saveAndFlush(otherAccount);

        assertThatThrownBy(() -> createFromVoice(TransactionType.TRANSFER, "300.50",
                wallet.getUuid(), otherAccount.getUuid()))
                .isInstanceOf(com.vikash_api.exceptions.InvalidTransactionException.class);
        assertThat(wallet.getBalance()).isEqualByComparingTo("2000.00");
        assertThat(otherAccount.getBalance()).isEqualByComparingTo("2000.00");
        assertThat(transactionRepository.count()).isZero();
    }

    private void createFromVoice(TransactionType type, String amount, UUID accountUuid, UUID destinationUuid) {
        when(aiAnalysisService.analyze(any(), any())).thenReturn(new com.vikash_api.dtos.responses.AiAnalysisResponse(
                "Lançamento de teste", new BigDecimal(amount), type, PaymentMethod.PIX,
                LocalDateTime.of(2026, 10, 4, 12, 0), accountUuid, null, destinationUuid,
                null, null, 1, java.util.List.of()));
        transactionService.create(new com.vikash_api.dtos.requests.TransactionRequest("Lançamento de teste"));
    }

    @Test
    void dailyTotalsGroupByDateAndExcludeTransfersInactiveAccountsAndOtherUsers() {
        transaction(wallet, null, 1);
        transaction(wallet, null, 2);
        transaction(wallet, otherAccount, 3);
        otherAccount.setActive(false);
        accountRepository.saveAndFlush(otherAccount);
        transaction(otherAccount, null, 4);
        var anotherUser = userRepository.save(UserEntity.builder().name("Outro")
                .email("evolution-foreign@test.local").password("test-only").build());
        var income = new TransactionEntity();
        income.setUser(user); income.setAccount(wallet); income.setDescription("Entrada");
        income.setAmount(new BigDecimal("100")); income.setType(TransactionType.INCOME);
        income.setPaymentMethod(PaymentMethod.PIX); income.setTranscription("Entrada de teste");
        income.setOccurredAt(LocalDateTime.of(2026, 10, 5, 0, 0));
        transactionRepository.save(income);
        var foreign = new TransactionEntity();
        foreign.setUser(anotherUser); foreign.setAccount(wallet); foreign.setDescription("Outro usuário");
        foreign.setAmount(new BigDecimal("999")); foreign.setType(TransactionType.EXPENSE);
        foreign.setPaymentMethod(PaymentMethod.PIX); foreign.setTranscription("Teste");
        foreign.setOccurredAt(LocalDateTime.of(2026, 10, 4, 14, 0));
        transactionRepository.saveAndFlush(foreign);

        var totals = transactionRepository.sumDailyTotalsByUserAndPeriod(user.getId(),
                LocalDateTime.of(2026, 10, 4, 0, 0), LocalDateTime.of(2026, 10, 6, 0, 0));
        assertThat(totals).hasSize(2);
        assertThat(totals.get(0).expenses()).isEqualByComparingTo("20");
        assertThat(totals.get(0).incomes()).isEqualByComparingTo("0");
        assertThat(totals.get(1).date()).isEqualTo(java.time.LocalDate.of(2026, 10, 5));
        assertThat(totals.get(1).incomes()).isEqualByComparingTo("100");
    }
}
