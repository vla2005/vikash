package com.vikash_api.service;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import com.vikash_api.entities.*;
import com.vikash_api.enums.*;
import com.vikash_api.repositories.*;
import com.vikash_api.services.*;
import com.vikash_api.dtos.requests.*;
import com.vikash_api.dtos.responses.AiAnalysisResponse;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:reviewed-voice;DB_CLOSE_DELAY=-1","security.ai.per-minute=100","security.ai.per-day=100"})
class ReviewedVoiceEntryIntegrationTest {
 @Autowired ReviewedTransactionService reviewed;
 @Autowired TransactionService transactions;
 @Autowired UserRepository users;
 @Autowired AccountRepository accounts;
 @Autowired TransactionRepository entries;
 @Autowired VoiceEntryReceiptRepository receipts;
 @MockitoBean AuthenticatedUserService auth;
 @MockitoBean AiAnalysisService ai;
 UserEntity user; AccountEntity account;
 @BeforeEach void setup(){
   user=users.saveAndFlush(UserEntity.builder().name("Voz").email(UUID.randomUUID()+"@voice.test").password("test-only").build());
   when(auth.getCurrentUser()).thenReturn(user);when(auth.getCurrentUserId()).thenReturn(user.getId());
   account=new AccountEntity();account.setUser(user);account.setDescription("Carteira");account.setType(AccountType.CARTEIRA);account.setBalance(new BigDecimal("1000.00"));account.setActive(true);account=accounts.saveAndFlush(account);
 }
 @AfterEach void cleanup(){receipts.deleteAll();entries.deleteAll();accounts.deleteAll();users.deleteAll();}
 AiAnalysisResponse analysis(UUID ownerAccount, TransactionType type, String amount){return new AiAnalysisResponse("Almoço",new BigDecimal(amount),type,PaymentMethod.PIX,LocalDateTime.of(2026,10,21,12,0),ownerAccount,null,null,null,null,1,List.of());}
 ReviewedTransactionRequest request(UUID id, AiAnalysisResponse value){return new ReviewedTransactionRequest(id,"Gastei 35 reais com almoço",value);}
 @Test void previewDoesNotWrite(){
   when(ai.analyze(any(),any())).thenReturn(analysis(account.getUuid(),TransactionType.EXPENSE,"35.50"));
   var result=transactions.preview(new TransactionRequest("Gastei trinta e cinco reais e cinquenta centavos com almoço no Pix da carteira"));
   assertThat(result.amount()).isEqualByComparingTo("35.50");assertThat(entries.count()).isZero();assertThat(receipts.count()).isZero();assertThat(accounts.findById(account.getId()).orElseThrow().getBalance()).isEqualByComparingTo("1000.00");
 }
 @Test void confirmsOnceAndUpdatesRealBalance(){
   var request=request(UUID.randomUUID(),analysis(account.getUuid(),TransactionType.EXPENSE,"89.90"));reviewed.confirm(request);reviewed.confirm(request);
   assertThat(entries.count()).isEqualTo(1);assertThat(receipts.count()).isEqualTo(1);assertThat(accounts.findById(account.getId()).orElseThrow().getBalance()).isEqualByComparingTo("910.10");verifyNoInteractions(ai);
 }
 @Test void incomeIncreasesBalance(){reviewed.confirm(request(UUID.randomUUID(),analysis(account.getUuid(),TransactionType.INCOME,"2500.00")));assertThat(accounts.findById(account.getId()).orElseThrow().getBalance()).isEqualByComparingTo("3500.00");}
 @Test void failedWriteRollsBackReceiptAndBalance(){
   var id=UUID.randomUUID();assertThatThrownBy(()->reviewed.confirm(request(id,analysis(account.getUuid(),TransactionType.EXPENSE,"0.001")))).isInstanceOf(RuntimeException.class);
   assertThat(entries.count()).isZero();assertThat(receipts.count()).isZero();reviewed.confirm(request(id,analysis(account.getUuid(),TransactionType.EXPENSE,"35.00")));assertThat(entries.count()).isEqualTo(1);
 }
 @Test void reusedKeyCannotChangeAmount(){
   var id=UUID.randomUUID();reviewed.confirm(request(id,analysis(account.getUuid(),TransactionType.EXPENSE,"35")));
   assertThatThrownBy(()->reviewed.confirm(request(id,analysis(account.getUuid(),TransactionType.EXPENSE,"36")))).isInstanceOf(RuntimeException.class);assertThat(entries.count()).isEqualTo(1);
 }
 @Test void otherUsersAccountCannotBeUsed(){
   var other=users.saveAndFlush(UserEntity.builder().name("Outro").email("other@voice.test").password("test-only").build());
   when(auth.getCurrentUser()).thenReturn(other);when(auth.getCurrentUserId()).thenReturn(other.getId());
   assertThatThrownBy(()->reviewed.confirm(request(UUID.randomUUID(),analysis(account.getUuid(),TransactionType.EXPENSE,"35")))).isInstanceOf(RuntimeException.class);assertThat(receipts.count()).isZero();assertThat(entries.count()).isZero();
 }
 @Test void simultaneousRetriesCreateOnlyOneEntry() throws Exception {
   var request=request(UUID.randomUUID(),analysis(account.getUuid(),TransactionType.EXPENSE,"35"));
   try(var executor=Executors.newFixedThreadPool(2)){
     var start=new CountDownLatch(1);
     var first=executor.submit(()->{start.await();reviewed.confirm(request);return true;});
     var second=executor.submit(()->{start.await();reviewed.confirm(request);return true;});
     start.countDown();assertThat(first.get(10,TimeUnit.SECONDS)).isTrue();assertThat(second.get(10,TimeUnit.SECONDS)).isTrue();
   }
   assertThat(entries.count()).isEqualTo(1);assertThat(receipts.count()).isEqualTo(1);
 }
 @Test void missingAccountDoesNotDefaultToOnlyAccount(){
   assertThatThrownBy(()->reviewed.confirm(request(UUID.randomUUID(),analysis(null,TransactionType.EXPENSE,"50")))).isInstanceOf(RuntimeException.class);assertThat(entries.count()).isZero();
 }
}
