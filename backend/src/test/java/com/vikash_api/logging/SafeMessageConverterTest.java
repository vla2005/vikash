package com.vikash_api.logging;
import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;

class SafeMessageConverterTest {
    @Test void hidesInfrastructureCredentialsEmailsJwtAndKnownPrivateFields() {
        String secret = "password=SECRET_PASSWORD, email=person@private.example, authorization=Bearer PRIVATE_TOKEN; "
                + "transcription=Gastei 50 na farmácia, amount=9876.54, balance=12345.67, "
                + "key=AIza01234567890123456789012345, jwt=eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJwcml2YXRlIn0.signature123";
        assertThat(SafeMessageConverter.redact(secret)).contains("[REDACTED]", "[JWT_REDACTED]", "[API_KEY_REDACTED]", "[EMAIL_REDACTED]")
                .doesNotContain("SECRET_PASSWORD", "PRIVATE_TOKEN", "private.example", "Gastei", "9876.54", "12345.67", "signature123");
    }
    @Test void keepsRequestIdStatusDurationsAndOperationalFieldNamesReadable() {
        String technical = "event=gemini.request.failed requestId=1234 reason=HIGH_DEMAND providerStatus=503 durationMs=30201 missingFields=[accountUuid,paymentMethod]";
        assertThat(SafeMessageConverter.redact(technical)).isEqualTo(technical);
    }
    @Test void masksQuotedJsonValuesWithoutLeakingTheirRemainder() {
        assertThat(SafeMessageConverter.redact("{\"password\":\"PRIVATE_PASSWORD\",\"transcription\":\"PRIVATE_TRANSCRIPTION\"}"))
                .doesNotContain("PRIVATE_PASSWORD", "PRIVATE_TRANSCRIPTION");
    }
}
