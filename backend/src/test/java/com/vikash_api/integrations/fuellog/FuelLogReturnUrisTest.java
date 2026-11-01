package com.vikash_api.integrations.fuellog;

import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;

class FuelLogReturnUrisTest {
 private final FuelLogOAuthConfiguration configuration=new FuelLogOAuthConfiguration();
 @Test void acceptsOnlyExplicitLocalOrHttpsWebAndFuelLogNativeReturns() {
  var repository=configuration.fuelLogClients("fuellog","{noop}synthetic-test-only","http://127.0.0.1:9191/callback",
    "http://127.0.0.1:9192/vikash-return","fuellog://vikash-return");
  var settings=repository.findByClientId("fuellog").getClientSettings();
  assertThat((String)settings.getSetting("fuellog.web-return-uri")).isEqualTo("http://127.0.0.1:9192/vikash-return");
  assertThat((String)settings.getSetting("fuellog.native-return-uri")).isEqualTo("fuellog://vikash-return");
 }
 @Test void rejectsLanHttpWildcardsAndWebQueriesWithoutRelaxingUriValidation() {
  for(String value:new String[]{"http://192.168.1.8:8081/return","https://*.example.com/return","https://example.com/return?next=other"})
   assertThatThrownBy(()->configuration.fuelLogClients("fuellog","{noop}synthetic-test-only","https://api.example.com/callback",value,""))
    .isInstanceOf(IllegalArgumentException.class);
 }
 @Test void rejectsOtherNativeSchemesAndAmbiguousNativeTargets() {
  for(String value:new String[]{"javascript:alert(1)","otherapp://vikash-return","fuellog://vikash-return?next=other","fuellog://vikash-return#fragment","fuellog://user@vikash-return"})
   assertThatThrownBy(()->configuration.fuelLogClients("fuellog","{noop}synthetic-test-only","https://api.example.com/callback","",value))
    .isInstanceOf(IllegalArgumentException.class);
 }
}
