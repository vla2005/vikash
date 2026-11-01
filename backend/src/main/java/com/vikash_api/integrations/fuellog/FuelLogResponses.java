package com.vikash_api.integrations.fuellog;

import java.util.List;
import java.util.UUID;
import com.vikash_api.enums.AccountType;
import com.vikash_api.enums.PaymentMethod;

public final class FuelLogResponses {
    private FuelLogResponses() {}

    public record Refueling(String externalId, long version, String status, UUID financialUuid,
            String financialKind, boolean manuallyModified) {}
    public record Outcome(Refueling response, String etag, boolean created) {}
    public record Category(String id, String name, String kind) {}
    public record Account(UUID uuid, String description, AccountType type) {}
    public record Card(UUID uuid, String description) {}
    public record Installments(int min, int max, boolean creditOnly) {}
    public record Catalog(String apiVersion, List<Category> categories, List<Account> accounts, List<Card> cards,
            List<PaymentMethod> paymentMethods, Installments installments, String currency) {}
}
