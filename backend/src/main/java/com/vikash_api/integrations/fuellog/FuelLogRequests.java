package com.vikash_api.integrations.fuellog;

import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.OffsetDateTime;
import java.util.UUID;
import com.vikash_api.enums.PaymentMethod;

public final class FuelLogRequests {
    private FuelLogRequests() {}

    public record Upsert(Long version, @JsonFormat(without = JsonFormat.Feature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE) OffsetDateTime occurredAt, String timeZone, BigDecimal amount,
            String currency, String description, String fuel, BigDecimal liters, String categoryId,
            PaymentMethod paymentMethod, UUID accountUuid, UUID creditCardUuid, Integer installmentCount) {}
}
