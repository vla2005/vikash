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
    @Test void masksDelegatedOAuthCredentialsAndBindingValues() {
        for(String key:java.util.List.of("client_secret","code_verifier","authorization_code","code","access_token","refresh_token","FUELLOG_CLIENT_SECRET_HASH")) {
            assertThat(SafeMessageConverter.redact(key+"=PRIVATE_OAUTH_VALUE; event=oauth"))
                    .as(key).contains("[REDACTED]").doesNotContain("PRIVATE_OAUTH_VALUE");
        }
    }
    @Test void masksQuotedJsonValuesWithoutLeakingTheirRemainder() {
        assertThat(SafeMessageConverter.redact("{\"password\":\"PRIVATE_PASSWORD\",\"transcription\":\"PRIVATE_TRANSCRIPTION\"}"))
                .doesNotContain("PRIVATE_PASSWORD", "PRIVATE_TRANSCRIPTION");
    }
    @org.junit.jupiter.api.Test void redactsVerificationTokensInAppLinks() {
        String token = "11111111-1111-4111-8111-111111111111." + "A".repeat(43);
        org.assertj.core.api.Assertions.assertThat(SafeMessageConverter.redact("vikash://verify-email?token=" + token))
                .doesNotContain(token).contains("[REDACTED]");
    }
}
