package com.vikash_api.integrations.fuellog;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import com.vikash_api.dtos.responses.AiAnalysisResponse;
import com.vikash_api.dtos.requests.TransactionUpdateRequest;
import com.vikash_api.entities.*;
import com.vikash_api.enums.*;
import com.vikash_api.exceptions.InvalidCreditCardInvoiceException;
import com.vikash_api.exceptions.InvalidTransactionException;
import com.vikash_api.exceptions.InvalidTransactionUpdateException;
import com.vikash_api.repositories.*;
import com.vikash_api.services.CreditCardPurchaseService;
import com.vikash_api.services.TransactionService;
import com.vikash_api.services.TransactionEditService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.vikash_api.integrations.fuellog.FuelLogResponses.*;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "integrations.fuellog.enabled", havingValue = "true")
public class FuelLogFinancialService {
    private final FuelLogAccess access;
    private final FuelLogRefuelingRepository receipts;
    private final AccountRepository accounts;
    private final CreditCardRepository cards;
    private final DefaultCategoryRepository defaults;
    private final CustomCategoryRepository custom;
    private final TransactionRepository transactions;
    private final CreditCardPurchaseRepository purchases;
    private final CreditCardInstallmentRepository installments;
    private final TransactionService transactionService;
    private final TransactionEditService editService;
    private final CreditCardPurchaseService purchaseService;
    private final EntityManager em;

    @Transactional
    public Catalog catalog() {
        var identity = access.lock();
        Long userId = identity.user().getId();
        var categories = new ArrayList<Category>();
        defaults.findAll().forEach(item -> categories.add(new Category("default:" + item.getId(), item.getName(), "DEFAULT")));
        custom.findByUserId(userId).forEach(item -> categories.add(new Category("custom:" + item.getUuid(), item.getName(), "CUSTOM")));
        var accountList = accounts.findByUserIdOrderByBalanceDesc(userId).stream().filter(item -> Boolean.TRUE.equals(item.getActive()))
                .map(item -> new Account(item.getUuid(), item.getDescription(), item.getType())).sorted(Comparator.comparing(Account::description).thenComparing(Account::uuid)).toList();
        var cardList = cards.findByUserIdAndActiveTrue(userId).stream().map(item -> new Card(item.getUuid(),
                item.getFinancialInstitution().getName() + (item.getLastFourDigits() == null ? "" : String.format(" •••• %04d", item.getLastFourDigits())))).toList();
        return new Catalog("1", categories, accountList, cardList,
                List.of(PaymentMethod.PIX, PaymentMethod.DEBIT_CARD, PaymentMethod.CASH, PaymentMethod.CREDIT_CARD,
                        PaymentMethod.BANK_TRANSFER, PaymentMethod.BANK_SLIP, PaymentMethod.OTHER),
                new Installments(1, 120, true), "BRL");
    }

    @Transactional
    public Outcome get(String externalId) {
        var identity = access.lock();
        validateExternalId(externalId);
        var receipt = find(identity, externalId);
        return outcome(receipt, current(receipt, identity.user().getId()), false);
    }

    @Transactional
    public Outcome put(String externalId, FuelLogRequests.Upsert input, String ifMatch, String ifNoneMatch) {
        var identity = access.lock();
        validateExternalId(externalId);
        var request = normalize(input);
        var payload = canonical(request);
        var existing = receipts.findByAuthorizationIdAndUserIdAndExternalId(identity.authorizationId(), identity.user().getId(), externalId);
        if (existing.isEmpty()) {
            if (ifNoneMatch == null) { throw error(428, "PRECONDITION_REQUIRED", "Informe If-None-Match para criar o abastecimento."); }
            if (!"*".equals(ifNoneMatch.trim()) || ifMatch != null) { throw precondition(); }
            var category = references(request, identity.user().getId());
            var receipt = new FuelLogRefuelingEntity();
            receipt.setUser(identity.user()); receipt.setAuthorizationId(identity.authorizationId()); receipt.setExternalId(externalId);
            saveFinancial(receipt, request, category);
            receipt.setVersion(request.version()); receipt.setCanonicalPayload(payload); receipt.setStatus("ACTIVE");
            receipt.setOccurredAt(request.occurredAt().toInstant()); receipt.setTimeZone(request.timeZone());
            var snapshot = snapshot(receipt.getFinancialUuid(), receipt.getFinancialKind(), identity.user().getId());
            receipt.setFinancialFingerprint(snapshot.fingerprint()); receipts.saveAndFlush(receipt);
            return outcome(receipt, snapshot, true);
        }
        var receipt = existing.get();
        var snapshot = current(receipt, identity.user().getId());
        requireActive(receipt);
        if (request.version() < receipt.getVersion()) { throw error(409, "STALE_VERSION", "A versão enviada é anterior à versão registrada."); }
        if (request.version() == receipt.getVersion()) {
            if (!payload.equals(receipt.getCanonicalPayload())) { throw error(409, "VERSION_CONFLICT", "Esta versão já foi usada com outro conteúdo."); }
            if ((ifMatch == null || ifMatch.isBlank()) && (ifNoneMatch == null || ifNoneMatch.isBlank())) {
                throw error(428, "PRECONDITION_REQUIRED", "Informe a precondição original para repetir o abastecimento.");
            }
            return outcome(receipt, snapshot, false);
        }
        requireMatch(ifMatch, outcome(receipt, snapshot, false).etag());
        var category = references(request, identity.user().getId());
        if (canEditWithoutRecreation(receipt.getFinancialUuid(), snapshot.kind(), request, identity.user().getId())) {
            editFinancial(receipt, snapshot, request, category);
        } else {
            deleteFinancial(receipt.getFinancialUuid(), snapshot);
            em.flush();
            saveFinancial(receipt, request, category);
        }
        receipt.setVersion(request.version()); receipt.setCanonicalPayload(payload);
        receipt.setOccurredAt(request.occurredAt().toInstant()); receipt.setTimeZone(request.timeZone());
        var updated = snapshot(receipt.getFinancialUuid(), receipt.getFinancialKind(), identity.user().getId());
        receipt.setFinancialFingerprint(updated.fingerprint());
        return outcome(receipt, updated, false);
    }

    @Transactional
    public Outcome cancel(String externalId, long version, String ifMatch) {
        var identity = access.lock();
        validateExternalId(externalId);
        if (version <= 0) { throw invalid(); }
        var receipt = find(identity, externalId);
        var snapshot = current(receipt, identity.user().getId());
        if ("CANCELLED".equals(receipt.getStatus()) && version == receipt.getVersion()) {
            if (ifMatch == null || ifMatch.isBlank()) { throw error(428, "PRECONDITION_REQUIRED", "Informe If-Match para repetir o cancelamento."); }
            return outcome(receipt, snapshot, false);
        }
        requireActive(receipt);
        if (version < receipt.getVersion()) { throw error(409, "STALE_VERSION", "A versão enviada é anterior à versão registrada."); }
        if (version == receipt.getVersion()) { throw error(409, "VERSION_CONFLICT", "Use uma versão maior para cancelar o abastecimento."); }
        requireMatch(ifMatch, outcome(receipt, snapshot, false).etag());
        deleteFinancial(receipt.getFinancialUuid(), snapshot);
        receipt.setFinancialKind(snapshot.kind()); receipt.setVersion(version); receipt.setStatus("CANCELLED");
        return outcome(receipt, null, false);
    }

    private FuelLogRefuelingEntity find(FuelLogAccess.Identity identity, String externalId) {
        return receipts.findByAuthorizationIdAndUserIdAndExternalId(identity.authorizationId(), identity.user().getId(), externalId)
                .orElseThrow(() -> error(404, "NOT_FOUND", "Abastecimento não encontrado."));
    }

    private Snapshot current(FuelLogRefuelingEntity receipt, Long userId) {
        if (!"ACTIVE".equals(receipt.getStatus())) { return null; }
        var snapshot = snapshot(receipt.getFinancialUuid(), receipt.getFinancialKind(), userId);
        if (snapshot == null) { receipt.setStatus("MANUALLY_DELETED"); }
        return snapshot;
    }

    private void requireActive(FuelLogRefuelingEntity receipt) {
        if ("CANCELLED".equals(receipt.getStatus())) { throw error(409, "CANCELLED", "Este abastecimento foi cancelado e não pode ser reativado."); }
        if ("MANUALLY_DELETED".equals(receipt.getStatus())) { throw error(409, "MANUALLY_DELETED", "O lançamento foi excluído no ViKash."); }
    }

    private Outcome outcome(FuelLogRefuelingEntity receipt, Snapshot snapshot, boolean created) {
        String kind = snapshot == null ? receipt.getFinancialKind() : snapshot.kind();
        boolean modified = "MANUALLY_DELETED".equals(receipt.getStatus()) || (snapshot != null &&
                (!kind.equals(receipt.getFinancialKind()) || !snapshot.fingerprint().equals(receipt.getFinancialFingerprint())));
        var response = new Refueling(receipt.getExternalId(), receipt.getVersion(), receipt.getStatus(), receipt.getFinancialUuid(), kind, modified);
        String etag = '"' + hash(receipt.getAuthorizationId(), receipt.getUser().getId(), receipt.getExternalId(), receipt.getVersion(),
                receipt.getStatus(), kind, snapshot == null ? receipt.getStatus() : snapshot.fingerprint()) + '"';
        return new Outcome(response, etag, created);
    }

    private void requireMatch(String supplied, String current) {
        if (supplied == null || supplied.isBlank()) { throw error(428, "PRECONDITION_REQUIRED", "Informe If-Match para alterar o abastecimento."); }
        if (!current.equals(supplied.trim())) { throw precondition(); }
    }

    private CategorySelection references(FuelLogRequests.Upsert request, Long userId) {
        DefaultCategoriesEntity defaultCategory = null;
        CustomCategoryEntity customCategory = null;
        try {
            if (request.categoryId().startsWith("default:")) {
                defaultCategory = defaults.findById(Long.parseLong(request.categoryId().substring(8))).orElseThrow(FuelLogFinancialService::reference);
            } else if (request.categoryId().startsWith("custom:")) {
                customCategory = custom.findOwnedForUpdate(UUID.fromString(request.categoryId().substring(7)), userId).orElseThrow(FuelLogFinancialService::reference);
            } else { throw reference(); }
        } catch (IllegalArgumentException exception) { throw reference(); }
        if (request.paymentMethod() == PaymentMethod.CREDIT_CARD) {
            var card = cards.findOwnedForUpdate(request.creditCardUuid(), userId).orElseThrow(FuelLogFinancialService::reference);
            em.refresh(card, LockModeType.PESSIMISTIC_WRITE);
            if (!Boolean.TRUE.equals(card.getActive())) { throw reference(); }
        } else {
            var account = accounts.findOwnedForUpdate(request.accountUuid(), userId).orElseThrow(FuelLogFinancialService::reference);
            em.refresh(account, LockModeType.PESSIMISTIC_WRITE);
            if (!Boolean.TRUE.equals(account.getActive())) { throw reference(); }
        }
        return new CategorySelection(defaultCategory, customCategory);
    }

    private boolean canEditWithoutRecreation(UUID uuid, String kind, FuelLogRequests.Upsert request, Long userId) {
        var occurredAt = request.occurredAt().atZoneSameInstant(ZoneId.of(request.timeZone())).toLocalDateTime();
        if (kind.equals("CREDIT_CARD_PURCHASE")) {
            var purchase = purchases.findByUuidAndCreditCardUserId(uuid, userId).orElseThrow(FuelLogFinancialService::reference);
            return purchase.getOccurredAt().equals(occurredAt) && purchase.getInstallmentCount().equals(request.installmentCount());
        }
        var entry = transactions.findByUuidAndUserId(uuid, userId).orElseThrow(FuelLogFinancialService::reference);
        return entry.getOccurredAt().equals(occurredAt) && request.installmentCount() == 1;
    }

    private void editFinancial(FuelLogRefuelingEntity receipt, Snapshot snapshot, FuelLogRequests.Upsert request, CategorySelection category) {
        var edit = new TransactionUpdateRequest(request.description(), request.amount(), request.paymentMethod(), request.accountUuid(),
                request.creditCardUuid(), null, null, category.custom() == null ? null : category.custom().getUuid());
        try {
            editService.updateStructured(receipt.getFinancialUuid(), snapshot.kind().equals("CREDIT_CARD_PURCHASE"), edit,
                    category.defaults() == null ? null : category.defaults().getId());
            receipt.setFinancialKind(request.paymentMethod() == PaymentMethod.CREDIT_CARD ? "CREDIT_CARD_PURCHASE" : "TRANSACTION");
            em.flush();
        } catch (InvalidTransactionException | InvalidCreditCardInvoiceException | InvalidTransactionUpdateException exception) { throw restriction(); }
    }
    private void saveFinancial(FuelLogRefuelingEntity receipt, FuelLogRequests.Upsert request, CategorySelection category) {
        var analysis = new AiAnalysisResponse(request.description(), request.amount(), TransactionType.EXPENSE,
                request.paymentMethod(), request.occurredAt().atZoneSameInstant(ZoneId.of(request.timeZone())).toLocalDateTime(),
                request.accountUuid(), request.creditCardUuid(), null, category.defaults() == null ? null : category.defaults().getName(),
                category.custom() == null ? null : category.custom().getUuid(), request.installmentCount(), List.of());
        try {
            receipt.setFinancialUuid(transactionService.createStructured(analysis, category.defaults() == null ? null : category.defaults().getId()));
            receipt.setFinancialKind(request.paymentMethod() == PaymentMethod.CREDIT_CARD ? "CREDIT_CARD_PURCHASE" : "TRANSACTION");
            em.flush();
        } catch (InvalidTransactionException | InvalidCreditCardInvoiceException exception) { throw restriction(); }
    }

    private void deleteFinancial(UUID uuid, Snapshot snapshot) {
        try {
            if (snapshot.kind().equals("CREDIT_CARD_PURCHASE")) { purchaseService.delete(uuid); }
            else { transactionService.delete(uuid); }
        } catch (InvalidTransactionException | InvalidCreditCardInvoiceException exception) { throw restriction(); }
    }

    private Snapshot snapshot(UUID uuid, String expectedKind, Long userId) {
        // Manual edits may convert a transaction to a purchase while retaining its UUID.
        Snapshot result = expectedKind.equals("TRANSACTION") ? transactionSnapshot(uuid, userId) : purchaseSnapshot(uuid, userId);
        if (result != null) { return result; }
        return expectedKind.equals("TRANSACTION") ? purchaseSnapshot(uuid, userId) : transactionSnapshot(uuid, userId);
    }

    private Snapshot transactionSnapshot(UUID uuid, Long userId) {
        var found = transactions.findOwnedForUpdate(uuid, userId);
        if (found.isEmpty()) { return null; }
        var entry = found.get(); em.refresh(entry, LockModeType.PESSIMISTIC_WRITE);
        return new Snapshot("TRANSACTION", hash(entry.getId(), entry.getUuid(), entry.getUser().getId(), entry.getAccount().getId(),
                entry.getDestinationAccount() == null ? null : entry.getDestinationAccount().getId(),
                entry.getCreditCardInvoice() == null ? null : entry.getCreditCardInvoice().getId(), entry.getDescription(), entry.getAmount(),
                entry.getType(), entry.getPaymentMethod(), defaultId(entry.getDefaultCategory()), customId(entry.getCustomCategory()),
                entry.getOccurredAt(), entry.getTranscription(), entry.getCreatedAt(), entry.getUpdatedAt()));
    }

    private Snapshot purchaseSnapshot(UUID uuid, Long userId) {
        var found = purchases.findOwnedForUpdate(uuid, userId);
        if (found.isEmpty()) { return null; }
        var purchase = found.get(); em.refresh(purchase, LockModeType.PESSIMISTIC_WRITE);
        var card = cards.findOwnedForUpdate(purchase.getCreditCard().getUuid(), userId).orElseThrow(FuelLogFinancialService::reference);
        em.refresh(card, LockModeType.PESSIMISTIC_WRITE);
        var values = new ArrayList<Object>();
        values.addAll(java.util.Arrays.asList(purchase.getId(), purchase.getUuid(), card.getId(), purchase.getDescription(), purchase.getAmount(),
                purchase.getInstallmentCount(), defaultId(purchase.getDefaultCategory()), customId(purchase.getCustomCategory()),
                purchase.getOccurredAt(), purchase.getTranscription(), purchase.getCreatedAt(), purchase.getUpdatedAt()));
        var parts = installments.findByPurchaseId(purchase.getId()).stream().sorted(Comparator.comparing(CreditCardInstallmentEntity::getInstallmentNumber)).toList();
        for (var part : parts) {
            em.refresh(part, LockModeType.PESSIMISTIC_WRITE);
            var invoice = part.getCreditCardInvoice(); em.refresh(invoice, LockModeType.PESSIMISTIC_WRITE);
            values.addAll(java.util.Arrays.asList(part.getId(), part.getUuid(), part.getInstallmentNumber(), part.getAmount(),
                    invoice.getId(), invoice.getUuid(), invoice.getCreditCard().getId(), invoice.getReferenceMonth(), invoice.getInitialAmount(),
                    invoice.getClosingDate(), invoice.getDueDate(), invoice.getStatus(), invoice.getCreatedAt(), invoice.getUpdatedAt()));
        }
        return new Snapshot("CREDIT_CARD_PURCHASE", hash(values.toArray()));
    }

    private Object defaultId(DefaultCategoriesEntity value) { return value == null ? null : value.getId(); }
    private Object customId(CustomCategoryEntity value) { return value == null ? null : value.getUuid(); }

    private FuelLogRequests.Upsert normalize(FuelLogRequests.Upsert value) {
        if (value == null || value.version() == null || value.version() <= 0 || value.occurredAt() == null || value.timeZone() == null
                || !"BRL".equals(value.currency()) || value.paymentMethod() == null || value.installmentCount() == null
                || value.installmentCount() < 1 || value.installmentCount() > 120 || value.categoryId() == null || value.categoryId().isBlank()
                || !validDecimal(value.amount(), 13, 2) || !validDecimal(value.liters(), 9, 3)
                || value.description() == null || value.description().strip().isEmpty() || value.description().strip().length() > 255
                || value.fuel() == null || value.fuel().strip().isEmpty() || value.fuel().strip().length() > 40) { throw invalid(); }
        try {
            if (!ZoneId.getAvailableZoneIds().contains(value.timeZone())
                    || !ZoneId.of(value.timeZone()).getRules().getOffset(value.occurredAt().toInstant()).equals(value.occurredAt().getOffset())) { throw invalid(); }
        } catch (DateTimeException exception) { throw invalid(); }
        boolean credit = value.paymentMethod() == PaymentMethod.CREDIT_CARD;
        if ((credit && (value.creditCardUuid() == null || value.accountUuid() != null))
                || (!credit && (value.accountUuid() == null || value.creditCardUuid() != null || value.installmentCount() != 1))
                || value.amount().compareTo(new BigDecimal("0.01").multiply(BigDecimal.valueOf(value.installmentCount()))) < 0) { throw invalid(); }
        return new FuelLogRequests.Upsert(value.version(), value.occurredAt(), value.timeZone(), value.amount().setScale(2), value.currency(),
                value.description().strip(), value.fuel().strip(), value.liters().setScale(3), value.categoryId().strip(), value.paymentMethod(),
                value.accountUuid(), value.creditCardUuid(), value.installmentCount());
    }

    private boolean validDecimal(BigDecimal value, int integer, int fraction) {
        if (value == null || value.signum() <= 0) { return false; }
        var normalized = value.stripTrailingZeros();
        return normalized.scale() <= fraction && normalized.precision() - normalized.scale() <= integer;
    }

    private String canonical(FuelLogRequests.Upsert value) {
        // Length-prefixed values avoid separator collisions and preserve normalized monetary precision.
        return encode(value.version(), value.occurredAt().toInstant(), value.timeZone(), value.amount(), value.currency(), value.description(),
                value.fuel(), value.liters(), value.categoryId(), value.paymentMethod(), value.accountUuid(), value.creditCardUuid(), value.installmentCount());
    }

    private static String encode(Object... values) {
        var result = new StringBuilder();
        for (var value : values) {
            if (value == null) { result.append('N'); }
            else { String text = value.toString(); result.append('V').append(text.length()).append(':').append(text); }
        }
        return result.toString();
    }

    private static String hash(Object... values) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(encode(values).getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
    }

    private void validateExternalId(String value) {
        if (value == null || !value.matches("[A-Za-z0-9._-]{1,100}")) { throw invalid(); }
    }
    private static FuelLogException error(int status, String code, String message) { return new FuelLogException(status, code, message); }
    private static FuelLogException invalid() { return error(400, "INVALID_REQUEST", "Dados inválidos para o abastecimento."); }
    private static FuelLogException reference() { return error(422, "INVALID_REFERENCE", "Escolha uma categoria e uma conta ou cartão disponíveis nesta conta ViKash."); }
    private static FuelLogException restriction() { return error(409, "FINANCIAL_RESTRICTION", "A operação não é permitida pelo estado atual das faturas."); }
    private static FuelLogException precondition() { return error(412, "PRECONDITION_FAILED", "O lançamento mudou. Consulte seu estado atual antes de confirmar a alteração."); }
    private record CategorySelection(DefaultCategoriesEntity defaults, CustomCategoryEntity custom) {}
    private record Snapshot(String kind, String fingerprint) {}
}
