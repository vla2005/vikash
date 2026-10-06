package com.vikash_api.controller;

import com.vikash_api.controllers.*;
import com.vikash_api.exceptions.GlobalExceptionHandler;
import com.vikash_api.services.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import java.util.stream.Stream;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class RequestValidationTest {
    private final AuthService auth = mock(AuthService.class);
    private final AccountService accounts = mock(AccountService.class);
    private final CategoryService categories = mock(CategoryService.class);
    private final TransactionService transactions = mock(TransactionService.class);
    private final CreditCardInvoiceService invoices = mock(CreditCardInvoiceService.class);
    private final CreditCardService cards = mock(CreditCardService.class);
    private final CreditCardPurchaseService purchases = mock(CreditCardPurchaseService.class);
    private LocalValidatorFactoryBean validator;
    private MockMvc mvc;
    private static final String UUID = "b4fbe04a-29d0-49e6-a52a-15ca00cb7bc5";

    @BeforeEach
    void setUp() {
        validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mvc = MockMvcBuilders.standaloneSetup(new AuthController(auth), new AccountController(accounts),
                        new CategoryController(categories), new TransactionController(transactions),
                        new CreditCardInvoiceController(invoices), new CreditCardController(cards), new CreditCardPurchaseController(purchases))
                .setValidator(validator).setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @AfterEach
    void closeValidator() { validator.close(); }

    @Test
    void detailsUseUuidQueryParameterAndRejectInvalidOrMissingUuid() throws Exception {
        mvc.perform(get("/api/transaction/details").param("uuid", UUID)).andExpect(status().isOk());
        verify(transactions).getByUuid(java.util.UUID.fromString(UUID));
        mvc.perform(get("/api/credit-card-purchase").param("uuid", UUID)).andExpect(status().isOk());
        verify(purchases).getByUuid(java.util.UUID.fromString(UUID));
        mvc.perform(get("/api/transaction/details").param("uuid", "invalid"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.uuid").isString());
        mvc.perform(get("/api/credit-card-purchase"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.uuid").isString());
    }

    static Stream<Arguments> emptyResponses() {
        String category = "{\"name\":\"Pets\",\"icon\":\"paw\",\"color\":\"sage\"}";
        String card = "{\"financialInstitutionId\":1,\"description\":\"Meu cartão\",\"creditLimit\":5000,\"closingDay\":3,\"dueDay\":10}";
        String payment = "{\"accountUuid\":\"" + UUID + "\",\"paymentMethod\":\"PIX\",\"occurredAt\":\"2026-01-01T12:00:00\"}";
        return Stream.of(
                Arguments.of("POST", "/api/category/create", category, 201),
                Arguments.of("PUT", "/api/category/update/" + UUID, category, 204),
                Arguments.of("POST", "/api/credit-card", card, 201),
                Arguments.of("PUT", "/api/credit-card/update/" + UUID, card, 204),
                Arguments.of("POST", "/api/credit-card-invoice/" + UUID + "/pay", payment, 204));
    }

    @ParameterizedTest
    @MethodSource("emptyResponses")
    void successfulWritesReturnNoBody(String method, String path, String body, int expectedStatus) throws Exception {
        mvc.perform(request(HttpMethod.valueOf(method), path).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(expectedStatus)).andExpect(content().string(""));
    }

    static Stream<Arguments> invalidRequests() {
        return Stream.of(
            Arguments.of("POST", "/api/credit-card-invoice/" + UUID + "/pay", "{}", "accountUuid"),
            Arguments.of("POST", "/api/credit-card-invoice/" + UUID + "/pay", "{\"accountUuid\":\"" + UUID + "\",\"occurredAt\":\"2026-01-01T12:00:00\"}", "paymentMethod"),
            Arguments.of("POST", "/api/credit-card-invoice/" + UUID + "/pay", "{\"accountUuid\":\"" + UUID + "\",\"paymentMethod\":\"PIX\",\"occurredAt\":\"2099-01-01T12:00:00\"}", "occurredAt"),
            Arguments.of("POST", "/api/credit-card-invoice", "{}", "creditCardUuid"),
            Arguments.of("POST", "/api/credit-card-invoice", "{\"creditCardUuid\":\"" + UUID + "\",\"referenceMonth\":\"2026-13\",\"closingDate\":\"2026-10-03\",\"dueDate\":\"2026-10-10\"}", "referenceMonth"),
            Arguments.of("PUT", "/api/credit-card-invoice/update/" + UUID, "{\"creditCardUuid\":\"" + UUID + "\",\"referenceMonth\":\"2026-10\"}", "dueDate"),
            Arguments.of("POST", "/api/account/create", "{}", "type"),
            Arguments.of("POST", "/api/account/create", "{\"type\":\"CARTEIRA\",\"description\":\"   \"}", "description"),
            Arguments.of("POST", "/api/account/create", "{\"type\":\"CARTEIRA\",\"description\":\"" + "a".repeat(101) + "\"}", "description"),
            Arguments.of("POST", "/api/account/create", "{\"type\":\"CARTEIRA\",\"description\":\"Dinheiro\",\"financialInstitutionId\":1}", "financialInstitutionId"),
            Arguments.of("PUT", "/api/account/update/" + UUID, "{\"type\":\"POUPANCA\",\"description\":\"Reserva\",\"financialInstitutionId\":0}", "financialInstitutionId"),
            Arguments.of("POST", "/api/account/create", "{\"type\":\"CARTEIRA\",\"description\":\"Dinheiro\",\"balance\":1.123}", "balance"),
            Arguments.of("PUT", "/api/account/update/" + UUID, "{\"type\":\"CARTEIRA\",\"description\":\"Dinheiro\",\"balance\":10000000000000}", "balance"),
            Arguments.of("POST", "/api/category/create", "{\"name\":\" a \",\"icon\":\"paw\",\"color\":\"blue\"}", "name"),
            Arguments.of("POST", "/api/category/create", "{\"name\":\"Pets\",\"icon\":\"invalid\",\"color\":\"blue\"}", "icon"),
            Arguments.of("PUT", "/api/category/update/" + UUID, "{\"name\":\"Pets\",\"icon\":\"paw\",\"color\":\"invalid\"}", "color"),
            Arguments.of("POST", "/api/category/create", "{}", "name"),
            Arguments.of("POST", "/api/transaction/create", "{\"transcription\":\"   \"}", "transcription"),
            Arguments.of("POST", "/api/transaction/create", "{\"transcription\":\"" + "a".repeat(5001) + "\"}", "transcription"),
            Arguments.of("POST", "/api/auth/register", "{\"name\":\"A\",\"email\":\"a@example.com\",\"password\":\"secret123\"}", "name"),
            Arguments.of("POST", "/api/auth/register", "{\"name\":\" A \",\"email\":\"a@example.com\",\"password\":\"secret123\"}", "name"),
            Arguments.of("POST", "/api/auth/register", "{\"name\":\"Teste\",\"email\":\"invalid\",\"password\":\"secret123\"}", "email"),
            Arguments.of("POST", "/api/auth/register", "{\"name\":\"Teste\",\"email\":\"a@example.com\",\"password\":\"short\"}", "password"),
            Arguments.of("POST", "/api/auth/register", "{\"name\":\"Teste\",\"email\":\"a@example.com\",\"password\":\"" + "é".repeat(37) + "\"}", "password"),
            Arguments.of("POST", "/api/auth/login", "{\"email\":\"a@example.com\",\"password\":\"" + "a".repeat(73) + "\"}", "password"),
            Arguments.of("POST", "/api/auth/login", "{\"email\":\"" + "a".repeat(140) + "@example.com\",\"password\":\"secret123\"}", "email"),
            Arguments.of("POST", "/api/auth/refresh", "{}", "refreshToken"),
            Arguments.of("POST", "/api/auth/refresh", "{\"refreshToken\":\"" + "a".repeat(4097) + "\"}", "refreshToken"),
            Arguments.of("POST", "/api/auth/logout", "{\"refreshToken\":\"   \"}", "refreshToken")
        );
    }

    @ParameterizedTest
    @MethodSource("invalidRequests")
    void rejectsInvalidRequestsBeforeCallingServices(String method, String path, String body, String field) throws Exception {
        mvc.perform(request(HttpMethod.valueOf(method), path).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors." + field).isString());
        verifyNoInteractions(auth, accounts, categories, transactions, invoices);
    }

    @Test
    void acceptsNegativeOrOmittedBalanceAndOptionalInstitution() throws Exception {
        for (String balance : new String[] { "", ",\"balance\":-125.50" }) {
            mvc.perform(post("/api/account/create").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"type\":\"CONTA_CORRENTE\",\"description\":\" Minha conta \"" + balance + "}"))
                    .andExpect(status().isCreated());
        }
        verify(accounts, times(2)).create(argThat(value -> value.description().equals("Minha conta")));
    }

    @Test
    void acceptsExistingShortPasswordOnLoginAndLogoutWithoutBody() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"a@example.com\",\"password\":\"old123\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/logout").header("Authorization", "Bearer access-token"))
                .andExpect(status().isNoContent());
        verify(auth).login(any());
        verify(auth).logout("access-token");
    }

    @Test
    void acceptsExactStorageAndTranscriptionLimits() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"" + "a".repeat(100) + "\",\"email\":\"a@example.com\",\"password\":\"" + "é".repeat(36) + "\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/account/create").contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"CARTEIRA\",\"description\":\"" + "a".repeat(100) + "\",\"balance\":-9999999999999.99}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/transaction/create").contentType(MediaType.APPLICATION_JSON)
                .content("{\"transcription\":\"" + "a".repeat(5000) + "\"}"))
                .andExpect(status().isCreated()).andExpect(content().string(""));
    }

    @Test
    void malformedJsonInvalidEnumAndInvalidUuidReturn400() throws Exception {
        mvc.perform(post("/api/transaction/create").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.body").isString());
        mvc.perform(post("/api/account/create").contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"INVALID\",\"description\":\"Conta\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/category/update/not-a-uuid").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Pets\",\"icon\":\"paw\",\"color\":\"blue\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.uuid").isString());
        verifyNoInteractions(auth, accounts, categories, transactions);
    }
}
