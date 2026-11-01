package com.vikash_api.integrations.fuellog;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import com.vikash_api.entities.*;
import com.vikash_api.enums.*;
import com.vikash_api.repositories.*;
import com.vikash_api.services.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@DataJpaTest(showSql = false, properties = {"integrations.fuellog.enabled=true", "spring.config.import=", "spring.datasource.url=jdbc:h2:mem:fuellog-financial;DB_CLOSE_DELAY=-1", "spring.jpa.show-sql=false"})
@Import({FuelLogFinancialService.class, TransactionService.class, CreditCardPurchaseService.class,
        CreditCardInvoiceService.class, TransactionEditService.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class FuelLogFinancialServiceTest {
    @Autowired FuelLogFinancialService service;
    @Autowired TransactionService transactions;
    @Autowired TransactionEditService edits;
    @Autowired AccountRepository accounts;
    @Autowired UserRepository users;
    @Autowired CustomCategoryRepository categories;
    @Autowired CreditCardRepository cards;
    @Autowired CreditCardPurchaseRepository purchases;
    @Autowired CreditCardInstallmentRepository installments;
    @Autowired TransactionRepository entries;
    @Autowired EntityManager em;
    @Autowired PlatformTransactionManager manager;
    @MockitoBean FuelLogAccess access;
    @MockitoBean AuthenticatedUserService authenticated;
    @MockitoBean AiAnalysisService ai;
    @MockitoBean AiUsageService aiUsage;
    @MockitoBean AccountService accountService;
    @MockitoBean CategoryService categoryService;
    UserEntity user;
    AccountEntity account;
    CustomCategoryEntity category;
    CreditCardEntity card;
    String authorization;

    @BeforeEach void setup() {
        user = users.saveAndFlush(UserEntity.builder().email(UUID.randomUUID()+"@fuellog.test")
                .name("FuelLog test").password("not-used").build());
        authorization = UUID.randomUUID().toString();
        when(access.lock()).thenAnswer(call -> {
            assertThat(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
            return new FuelLogAccess.Identity(user, authorization);
        });
        when(authenticated.getCurrentUser()).thenReturn(user);
        when(authenticated.getCurrentUserId()).thenReturn(user.getId());
        account = new AccountEntity(); account.setUser(user); account.setDescription("Carteira");
        account.setType(AccountType.CARTEIRA); account.setActive(true); account.setBalance(new BigDecimal("1000.00"));
        account = accounts.saveAndFlush(account);
        category = new CustomCategoryEntity(); category.setUser(user); category.setName("Combustível");
        category.setIcon("fuel"); category.setColor("green"); category = categories.saveAndFlush(category);
        card = tx(() -> {
            var institution = new FinancialInstitutionEntity();
            org.springframework.test.util.ReflectionTestUtils.setField(institution, "name", "Banco");
            org.springframework.test.util.ReflectionTestUtils.setField(institution, "logoUrl", "test.svg"); em.persist(institution);
            var value = new CreditCardEntity(); value.setUser(user); value.setFinancialInstitution(institution);
            value.setLastFourDigits(1234); value.setCreditLimit(new BigDecimal("5000.00"));
            value.setClosingDay(20); value.setDueDay(28); return cards.saveAndFlush(value);
        });
    }

    @Test void retryNormalizesDecimalsAndDebitsOnce() {
        var created = service.put("retry", request(1,"251.60",false,1), null,"*");
        var replay = service.put("retry", request(1,"251.600",false,1), null,"*");
        assertThat(created.created()).isTrue(); assertThat(replay.created()).isFalse();
        assertThat(replay.response().financialUuid()).isEqualTo(created.response().financialUuid());
        assertThat(service.get("retry").etag()).isEqualTo(created.etag());
        assertThat(balance()).isEqualByComparingTo("748.40");
        verifyNoInteractions(ai, aiUsage);
        assertThat(entries.findByUuidAndUserId(created.response().financialUuid(),user.getId())).isPresent();
    }

    @Test void conflictsCannotDebitAgainAndMissingPreconditionCannotCreate() {
        expect("PRECONDITION_REQUIRED", () -> service.put("missing",request(1,"10",false,1),null,null));
        var first = service.put("conflict",request(3,"10",false,1),null,"*");
        expect("VERSION_CONFLICT", () -> service.put("conflict",request(3,"11",false,1),first.etag(),null));
        expect("STALE_VERSION", () -> service.put("conflict",request(2,"10",false,1),first.etag(),null));
        expect("PRECONDITION_REQUIRED", () -> service.put("conflict",request(4,"20",false,1),null,null));
        assertThat(balance()).isEqualByComparingTo("990.00");
    }

    @Test void manualEditChangesEtagAndRequiresExplicitCurrentPrecondition() {
        var first = service.put("manual",request(1,"10",false,1),null,"*");
        tx(() -> { var entry = entries.findByUuidAndUserId(first.response().financialUuid(),user.getId()).orElseThrow();
            entry.setDescription("Mudança manual"); return null; });
        var changed = service.get("manual");
        assertThat(changed.etag()).isNotEqualTo(first.etag()); assertThat(changed.response().manuallyModified()).isTrue();
        expect("PRECONDITION_FAILED", () -> service.put("manual",request(2,"20",false,1),first.etag(),null));
        var updated = service.put("manual",request(2,"20",false,1),changed.etag(),null);
        assertThat(updated.response().manuallyModified()).isFalse(); assertThat(balance()).isEqualByComparingTo("980.00");
    }

    @Test void manualDeletionBecomesPermanentTombstone() {
        var first = service.put("deleted",request(1,"10",false,1),null,"*");
        transactions.delete(first.response().financialUuid());
        assertThat(service.get("deleted").response().status()).isEqualTo("MANUALLY_DELETED");
        expect("MANUALLY_DELETED", () -> service.put("deleted",request(2,"20",false,1),first.etag(),null));
        assertThat(balance()).isEqualByComparingTo("1000.00");
    }

    @Test void cancellationReversesBalanceOnceAndNeverReactivates() {
        var first = service.put("cancel",request(1,"10",false,1),null,"*");
        var cancelled = service.cancel("cancel",2,first.etag());
        assertThat(cancelled.response().status()).isEqualTo("CANCELLED");
        assertThat(service.cancel("cancel",2,first.etag()).etag()).isEqualTo(cancelled.etag());
        expect("CANCELLED", () -> service.put("cancel",request(3,"10",false,1),cancelled.etag(),null));
        expect("CANCELLED", () -> service.put("cancel",request(1,"10",false,1),null,"*"));
        assertThat(balance()).isEqualByComparingTo("1000.00");
    }

    @Test void creditDistributesCentsWithoutAccountDebitAndPaidInvoiceBlocksChanges() {
        var first = service.put("credit",request(1,"10.00",true,3),null,"*");
        assertThat(first.response().financialKind()).isEqualTo("CREDIT_CARD_PURCHASE");
        var parts = tx(() -> installments.findByPurchaseId(purchases.findByUuidAndCreditCardUserId(first.response().financialUuid(),user.getId()).orElseThrow().getId())
                .stream().sorted(java.util.Comparator.comparing(CreditCardInstallmentEntity::getInstallmentNumber))
                .map(CreditCardInstallmentEntity::getAmount).toList());
        assertThat(parts).containsExactly(new BigDecimal("3.33"),new BigDecimal("3.33"),new BigDecimal("3.34"));
        assertThat(balance()).isEqualByComparingTo("1000.00");
        tx(() -> { var purchase = purchases.findByUuidAndCreditCardUserId(first.response().financialUuid(),user.getId()).orElseThrow();
            installments.findByPurchaseId(purchase.getId()).getFirst().getCreditCardInvoice().setStatus(CreditCardInvoiceStatus.PAID); return null; });
        var paid = service.get("credit"); assertThat(paid.etag()).isNotEqualTo(first.etag());
        expect("PRECONDITION_FAILED", () -> service.cancel("credit",2,first.etag()));
        expect("FINANCIAL_RESTRICTION", () -> service.cancel("credit",2,paid.etag()));
        expect("FINANCIAL_RESTRICTION", () -> service.put("credit",request(2,"20",false,1),paid.etag(),null));
        assertThat(service.get("credit").response().version()).isEqualTo(1);
        assertThat(balance()).isEqualByComparingTo("1000.00");
    }

    @Test void manualModalityConversionIsDetectedAndDeletionUsesCurrentFinancialKind() {
        var first = service.put("converted",request(1,"10",false,1),null,"*");
        edits.updateTransaction(first.response().financialUuid(),new com.vikash_api.dtos.requests.TransactionUpdateRequest(
                "Manual crédito",new BigDecimal("10.00"),PaymentMethod.CREDIT_CARD,null,card.getUuid(),null,null,category.getUuid()));
        var converted = service.get("converted");
        assertThat(converted.response().financialKind()).isEqualTo("CREDIT_CARD_PURCHASE");
        assertThat(converted.response().manuallyModified()).isTrue();
        expect("PRECONDITION_FAILED", () -> service.cancel("converted",2,first.etag()));
        service.cancel("converted",2,converted.etag());
        assertThat(balance()).isEqualByComparingTo("1000.00");
        assertThat(purchases.findByUuidAndCreditCardUserId(first.response().financialUuid(),user.getId())).isEmpty();
    }

    @Test void connectionAndUserScopePreventLookupAndReplayAcrossConnections() {
        service.put("scoped",request(1,"10",false,1),null,"*");
        authorization = UUID.randomUUID().toString();
        expect("NOT_FOUND", () -> service.get("scoped"));
        service.put("scoped",request(1,"10",false,1),null,"*");
        assertThat(balance()).isEqualByComparingTo("980.00");
        var other = users.saveAndFlush(UserEntity.builder().email(UUID.randomUUID()+"@other.test").name("Other").password("unused").build());
        doReturn(new FuelLogAccess.Identity(other,authorization)).when(access).lock();
        expect("NOT_FOUND", () -> service.get("scoped"));
        expect("INVALID_REFERENCE", () -> service.put("alien",request(1,"10",false,1),null,"*"));
    }

    @Test void invalidReferencesAndInvalidMoneyNeverTouchBalances() {
        tx(() -> { accounts.findById(account.getId()).orElseThrow().setActive(false); return null; });
        expect("INVALID_REFERENCE", () -> service.put("inactive",request(1,"10",false,1),null,"*"));
        expect("INVALID_REQUEST", () -> service.put("scale",request(1,"10.001",false,1),null,"*"));
        expect("INVALID_REQUEST", () -> service.put("cents",request(1,"0.01",true,2),null,"*"));
        var wrongZone = new FuelLogRequests.Upsert(1L,OffsetDateTime.parse("2026-11-01T14:30:00Z"),"America/Sao_Paulo",
                new BigDecimal("10"),"BRL","Posto","GASOLINE",new BigDecimal("1"),"custom:"+category.getUuid(),PaymentMethod.PIX,account.getUuid(),null,1);
        expect("INVALID_REQUEST", () -> service.put("zone",wrongZone,null,"*"));
        assertThat(balance()).isEqualByComparingTo("1000.00");
    }

    @Test void manualEntriesAreNotMutationTargetsAndUnavailableReferencesAreRejected() {
        var analysis = new com.vikash_api.dtos.responses.AiAnalysisResponse("Manual",new BigDecimal("10.00"),TransactionType.EXPENSE,
                PaymentMethod.PIX,java.time.LocalDateTime.of(2026,11,1,14,30),account.getUuid(),null,null,null,category.getUuid(),1,List.of());
        var manual = transactions.createStructured(analysis,null);
        expect("NOT_FOUND", () -> service.get(manual.toString()));
        expect("NOT_FOUND", () -> service.cancel(manual.toString(),2,"\"arbitrary\""));
        expect("PRECONDITION_REQUIRED", () -> service.put(manual.toString(),request(2,"50",false,1),"\"arbitrary\"",null));
        assertThat(entries.findByUuidAndUserId(manual,user.getId()).orElseThrow().getAmount()).isEqualByComparingTo("10.00");
        tx(() -> { cards.findById(card.getId()).orElseThrow().setActive(false); return null; });
        expect("INVALID_REFERENCE", () -> service.put("inactive-card",request(1,"10",true,1),null,"*"));
        var other=users.saveAndFlush(UserEntity.builder().email(UUID.randomUUID()+"@other.test").name("Other").password("unused").build());
        var foreignCategory=new CustomCategoryEntity();foreignCategory.setUser(other);foreignCategory.setName("Foreign");
        foreignCategory.setIcon("fuel");foreignCategory.setColor("green");foreignCategory=categories.saveAndFlush(foreignCategory);
        for(String categoryId:List.of("default:"+Long.MAX_VALUE,"custom:"+UUID.randomUUID(),"custom:"+foreignCategory.getUuid())) {
            var r=request(1,"10",false,1);
            var invalidCategory=new FuelLogRequests.Upsert(r.version(),r.occurredAt(),r.timeZone(),r.amount(),r.currency(),r.description(),r.fuel(),
                    r.liters(),categoryId,r.paymentMethod(),r.accountUuid(),r.creditCardUuid(),r.installmentCount());
            expect("INVALID_REFERENCE", () -> service.put("invalid-category",invalidCategory,null,"*"));
        }
        assertThat(balance()).isEqualByComparingTo("990.00");
        verifyNoInteractions(ai,aiUsage);
    }

    @Test void catalogScopesCategoriesAndHidesInactiveAndSensitiveBankData() {
        tx(() -> { accounts.findById(account.getId()).orElseThrow().setActive(false); cards.findById(card.getId()).orElseThrow().setActive(false); return null; });
        var catalog = service.catalog();
        assertThat(catalog.categories()).extracting(FuelLogResponses.Category::id).contains("custom:"+category.getUuid());
        assertThat(catalog.accounts()).isEmpty(); assertThat(catalog.cards()).isEmpty();
        assertThat(catalog.currency()).isEqualTo("BRL"); assertThat(catalog.installments().max()).isEqualTo(120);
    }

    @Test void retriesKeepOriginalPreconditionButCannotOmitIt() {
        var first = service.put("headers",request(1,"10",false,1),null,"*");
        expect("PRECONDITION_REQUIRED", () -> service.put("headers",request(1,"10",false,1),null,null));
        var cancelled = service.cancel("headers",2,first.etag());
        expect("PRECONDITION_REQUIRED", () -> service.cancel("headers",2,null));
        assertThat(service.cancel("headers",2,first.etag()).etag()).isEqualTo(cancelled.etag());
    }

    @Test void failedReplacementRollsBackOldEntryAndItsBalance() {
        var paid = service.put("target-invoice",request(1,"10",true,1),null,"*");
        tx(() -> { var purchase = purchases.findByUuidAndCreditCardUserId(paid.response().financialUuid(),user.getId()).orElseThrow();
            installments.findByPurchaseId(purchase.getId()).getFirst().getCreditCardInvoice().setStatus(CreditCardInvoiceStatus.PAID); return null; });
        var original = service.put("rollback",request(1,"20",false,1),null,"*");
        expect("FINANCIAL_RESTRICTION", () -> service.put("rollback",request(2,"30",true,1),original.etag(),null));
        assertThat(balance()).isEqualByComparingTo("980.00");
        assertThat(entries.findByUuidAndUserId(original.response().financialUuid(),user.getId())).isPresent();
        assertThat(service.get("rollback").etag()).isEqualTo(original.etag());
    }
    @Test void persistedDefaultCategoryIdIsExactEvenIfNamesMatch() {
        var ids = tx(() -> {
            var name = "Fuel-"+UUID.randomUUID();
            var result = new java.util.ArrayList<Long>();
            for (int number=0;number<2;number++) {
                var value = new DefaultCategoriesEntity();
                org.springframework.test.util.ReflectionTestUtils.setField(value,"name",name);
                org.springframework.test.util.ReflectionTestUtils.setField(value,"icon","fuel");
                org.springframework.test.util.ReflectionTestUtils.setField(value,"color","green");
                em.persist(value); em.flush(); result.add(value.getId());
            }
            return result;
        });
        var source = request(1,"10",false,1);
        var input = new FuelLogRequests.Upsert(source.version(),source.occurredAt(),source.timeZone(),source.amount(),source.currency(),
                source.description(),source.fuel(),source.liters(),"default:"+ids.getLast(),source.paymentMethod(),source.accountUuid(),null,1);
        var created = service.put("default-id",input,null,"*");
        var actualId = tx(() -> entries.findByUuidAndUserId(created.response().financialUuid(),user.getId()).orElseThrow().getDefaultCategory().getId());
        assertThat(actualId).isEqualTo(ids.getLast());
    }
    @Test void paidPurchaseAcceptsMetadataAndCategoryEditsWithoutReplacingFinancialRows() {
        var first = service.put("paid-edit",request(1,"10",true,3),null,"*");
        tx(() -> { var purchase = purchases.findByUuidAndCreditCardUserId(first.response().financialUuid(),user.getId()).orElseThrow();
            installments.findByPurchaseId(purchase.getId()).getFirst().getCreditCardInvoice().setStatus(CreditCardInvoiceStatus.PAID); return null; });
        var current = service.get("paid-edit");
        var before = installmentState(first.response().financialUuid());
        var source = request(2,"10",true,3);
        var metadataOnly = new FuelLogRequests.Upsert(2L,source.occurredAt(),source.timeZone(),source.amount(),source.currency(),
                source.description(),"ETHANOL",new BigDecimal("35.125"),source.categoryId(),source.paymentMethod(),null,source.creditCardUuid(),3);
        var metadata = service.put("paid-edit",metadataOnly,current.etag(),null);
        assertThat(metadata.response().financialUuid()).isEqualTo(first.response().financialUuid());
        assertThat(installmentState(first.response().financialUuid())).isEqualTo(before);
        assertThat(metadata.response().manuallyModified()).isFalse();
        var categoryIds = tx(() -> {
            String name = "Paid-category-"+UUID.randomUUID();
            var result = new java.util.ArrayList<Long>();
            for (int number=0;number<2;number++) {
                var value = new DefaultCategoriesEntity();
                org.springframework.test.util.ReflectionTestUtils.setField(value,"name",name);
                org.springframework.test.util.ReflectionTestUtils.setField(value,"icon","fuel");
                org.springframework.test.util.ReflectionTestUtils.setField(value,"color","blue");
                em.persist(value); em.flush(); result.add(value.getId());
            }
            return result;
        });
        var revised = new FuelLogRequests.Upsert(3L,source.occurredAt(),source.timeZone(),source.amount(),source.currency(),
                "Descrição corrigida","ETHANOL",new BigDecimal("35.125"),"default:"+categoryIds.getLast(),source.paymentMethod(),null,source.creditCardUuid(),3);
        var edited = service.put("paid-edit",revised,metadata.etag(),null);
        assertThat(edited.response().financialUuid()).isEqualTo(first.response().financialUuid());
        assertThat(edited.response().manuallyModified()).isFalse();
        assertThat(installmentState(first.response().financialUuid())).isEqualTo(before);
        tx(() -> { var purchase = purchases.findByUuidAndCreditCardUserId(first.response().financialUuid(),user.getId()).orElseThrow();
            assertThat(purchase.getDescription()).isEqualTo("Descrição corrigida");
            assertThat(purchase.getDefaultCategory().getId()).isEqualTo(categoryIds.getLast());
            assertThat(purchase.getCustomCategory()).isNull(); return null; });
        assertThat(balance()).isEqualByComparingTo("1000.00");
    }

    @Test void paidPurchaseStillRejectsAmountDateAndInstallmentCountChanges() {
        var first = service.put("paid-shape",request(1,"10",true,3),null,"*");
        tx(() -> { var purchase = purchases.findByUuidAndCreditCardUserId(first.response().financialUuid(),user.getId()).orElseThrow();
            installments.findByPurchaseId(purchase.getId()).getFirst().getCreditCardInvoice().setStatus(CreditCardInvoiceStatus.PAID); return null; });
        var current = service.get("paid-shape");
        expect("FINANCIAL_RESTRICTION", () -> service.put("paid-shape",request(2,"11",true,3),current.etag(),null));
        expect("FINANCIAL_RESTRICTION", () -> service.put("paid-shape",request(2,"10",true,2),current.etag(),null));
        var source = request(2,"10",true,3);
        var changedDate = new FuelLogRequests.Upsert(2L,source.occurredAt().plusDays(1),source.timeZone(),source.amount(),source.currency(),
                source.description(),source.fuel(),source.liters(),source.categoryId(),source.paymentMethod(),null,source.creditCardUuid(),3);
        expect("FINANCIAL_RESTRICTION", () -> service.put("paid-shape",changedDate,current.etag(),null));
        assertThat(service.get("paid-shape").etag()).isEqualTo(current.etag());
        assertThat(service.get("paid-shape").response().version()).isEqualTo(1);
    }

    private List<String> installmentState(UUID uuid) {
        return tx(() -> { var purchase = purchases.findByUuidAndCreditCardUserId(uuid,user.getId()).orElseThrow();
            return installments.findByPurchaseId(purchase.getId()).stream().sorted(java.util.Comparator.comparing(CreditCardInstallmentEntity::getInstallmentNumber))
                    .map(part -> part.getUuid()+"|"+part.getCreditCardInvoice().getUuid()+"|"+part.getInstallmentNumber()+"|"+part.getAmount()+"|"+part.getCreditCardInvoice().getStatus()).toList(); });
    }
    private FuelLogRequests.Upsert request(long version,String amount,boolean credit,int count) {
        return new FuelLogRequests.Upsert(version,OffsetDateTime.parse("2026-11-01T14:30:00-03:00"),"America/Sao_Paulo",
                new BigDecimal(amount),"BRL","Abastecimento","GASOLINE",new BigDecimal("40.000"),"custom:"+category.getUuid(),
                credit?PaymentMethod.CREDIT_CARD:PaymentMethod.PIX,credit?null:account.getUuid(),credit?card.getUuid():null,count);
    }
    private BigDecimal balance() { return accounts.findByUuid(account.getUuid()).orElseThrow().getBalance(); }
    private <T> T tx(Supplier<T> action) { return new TransactionTemplate(manager).execute(status -> action.get()); }
    private void expect(String code,Runnable action) { assertThatThrownBy(action::run).isInstanceOfSatisfying(FuelLogException.class,
            failure -> assertThat(failure.code()).isEqualTo(code)); }
}
