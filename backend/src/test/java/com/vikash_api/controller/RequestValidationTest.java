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
    private final TransactionEditService transactionEdits = mock(TransactionEditService.class);
    private final CreditCardInvoiceService invoices = mock(CreditCardInvoiceService.class);
    private final CreditCardService cards = mock(CreditCardService.class);
    private final CreditCardPurchaseService purchases = mock(CreditCardPurchaseService.class);
    private final UserService users = mock(UserService.class);
    private LocalValidatorFactoryBean validator;
    private MockMvc mvc;
    private static final String UUID = "b4fbe04a-29d0-49e6-a52a-15ca00cb7bc5";

    @BeforeEach
    void setUp() {
        validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mvc = MockMvcBuilders.standaloneSetup(new AuthController(auth), new AccountController(accounts),
                        new CategoryController(categories), new TransactionController(transactions, transactionEdits),
                        new CreditCardInvoiceController(invoices), new CreditCardController(cards, invoices), new CreditCardPurchaseController(purchases, transactionEdits), new UserController(users))
                .setValidator(validator).setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @AfterEach
    void closeValidator() { validator.close(); }

    @Test
    void createsCardWithAvailableLimitAndDistributesInvoicesWithEmptyResponses() throws Exception {
        mvc.perform(post("/api/credit-card").contentType(MediaType.APPLICATION_JSON).content("""
                {"financialInstitutionId":1,"description":"Meu cartão","creditLimit":5000,
                 "closingDay":3,"dueDay":10,"availableLimit":0}
                """))
                .andExpect(status().isCreated()).andExpect(content().string(""));
        verify(cards).create(argThat(request -> request.availableLimit().signum() == 0));
        mvc.perform(patch("/api/credit-card/" + UUID + "/initial-invoices")
                .contentType(MediaType.APPLICATION_JSON).content("""
                {"invoices":[{"referenceMonth":" 2026-10 ","initialAmount":800,
                  "closingDate":"2026-10-03","dueDate":"2026-10-10"}]}
                """))
                .andExpect(status().isNoContent()).andExpect(content().string(""));
        verify(invoices).distributeInitialAmounts(eq(java.util.UUID.fromString(UUID)),
                argThat(request -> request.invoices().getFirst().referenceMonth().equals("2026-10")));
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"-1", "0.001", "10000000000000"})
    void rejectsInvalidAvailableLimitBeforeCallingService(String amount) throws Exception {
        mvc.perform(post("/api/credit-card").contentType(MediaType.APPLICATION_JSON).content("""
                {"financialInstitutionId":1,"description":"Meu cartão","creditLimit":5000,
                 "closingDay":3,"dueDay":10,"availableLimit":%s}
                """.formatted(amount)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.availableLimit").isString());
        verifyNoInteractions(cards);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {
            "{}", "{\"invoices\":[]}", "{\"invoices\":[null]}",
            "{\"invoices\":[{\"referenceMonth\":\"2026-13\",\"initialAmount\":-1}]}",
            "{\"invoices\":[{\"referenceMonth\":\"2026-10\",\"initialAmount\":0.001,\"closingDate\":\"2026-10-03\",\"dueDate\":\"2026-10-10\"}]}"
    })
    void rejectsInvalidInitialInvoiceRequestsBeforeCallingService(String body) throws Exception {
        mvc.perform(patch("/api/credit-card/" + UUID + "/initial-invoices")
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors").isNotEmpty());
        verifyNoInteractions(invoices);
    }

    @Test
    void invalidInitialSetupReturnsFieldErrorInsteadOfInternalError() throws Exception {
        doThrow(new com.vikash_api.exceptions.InvalidCreditCardSetupException("availableLimit", "Limite inválido."))
                .when(cards).create(any());
        mvc.perform(post("/api/credit-card").contentType(MediaType.APPLICATION_JSON).content("""
                {"financialInstitutionId":1,"description":"Meu cartão","creditLimit":5000,
                 "closingDay":3,"dueDay":10,"availableLimit":6000}
                """))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.availableLimit").value("Limite inválido."));
    }

    @Test
    void recoveryEndpointsReturnEmptyOkResponses() throws Exception {
        mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\" LIVIA@example.com \"}"))
                .andExpect(status().isOk()).andExpect(content().string(""));
        verify(auth).requestPasswordReset(argThat(request -> request.email().equals("livia@example.com")));
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + "A".repeat(43) + "\",\"newPassword\":\"NewPassword123!\"}"))
                .andExpect(status().isOk()).andExpect(content().string(""));
        verify(auth).resetPassword(any());
    }

    static Stream<Arguments> invalidRecoveryRequests() {
        return Stream.of(
                Arguments.of("/api/auth/forgot-password", "{}", "email"),
                Arguments.of("/api/auth/forgot-password", "{\"email\":\"invalid\"}", "email"),
                Arguments.of("/api/auth/forgot-password", "{\"email\":\"" + "a".repeat(151) + "@example.com\"}", "email"),
                Arguments.of("/api/auth/reset-password", "{}", "token"),
                Arguments.of("/api/auth/reset-password", "{\"token\":\"invalid\",\"newPassword\":\"NewPassword123!\"}", "token"),
                Arguments.of("/api/auth/reset-password", "{\"token\":\"" + "!".repeat(43) + "\",\"newPassword\":\"NewPassword123!\"}", "token"),
                Arguments.of("/api/auth/reset-password", "{\"token\":\"" + "A".repeat(43) + "\",\"newPassword\":\"weak\"}", "newPassword")
        );
    }

    @ParameterizedTest
    @MethodSource("invalidRecoveryRequests")
    void rejectsInvalidRecoveryRequestsBeforeCallingService(String path, String body, String field) throws Exception {
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors." + field).isString());
        verifyNoInteractions(auth);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"short1!", "abcdefg1!", "Abcdefgh!", "Abcdefg1", "Abcdef1á"})
    void resetEnforcesTheSamePasswordPolicyAsRegistration(String password) throws Exception {
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + "A".repeat(43) + "\",\"newPassword\":\"" + password + "\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.newPassword").isString());
        verifyNoInteractions(auth);
    }

    @Test
    void invalidResetLinkReturnsAFriendlyTokenError() throws Exception {
        doThrow(new com.vikash_api.exceptions.PasswordResetException("Link inválido ou expirado."))
                .when(auth).resetPassword(any());
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + "A".repeat(43) + "\",\"newPassword\":\"NewPassword123!\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.token").value("Link inválido ou expirado."));
    }

    static Stream<Arguments> invalidPasswordUpdates() {
        return Stream.of(
                Arguments.of("old123", "Ab1!", "newPassword"),
                Arguments.of("old123", "abcdef1!", "newPassword"),
                Arguments.of("old123", "Abcdefg!", "newPassword"),
                Arguments.of("old123", "Abcdefg1", "newPassword"),
                Arguments.of("old123", "Abcdef1 ", "newPassword"),
                Arguments.of("old123", "Abcdef1á", "newPassword"),
                Arguments.of("old123", "A".repeat(71) + "1!", "newPassword"),
                Arguments.of("old123", "Á" + "a".repeat(69) + "1!", "newPassword"),
                Arguments.of("old123", null, "newPassword"),
                Arguments.of("old123", "", "newPassword"),
                Arguments.of("   ", "Abcdef1!", "password")
        );
    }

    @ParameterizedTest
    @MethodSource("invalidPasswordUpdates")
    void rejectsInvalidPasswordUpdatesBeforeCallingService(String password, String newPassword, String field) throws Exception {
        String newPasswordJson = newPassword == null ? "null" : "\"" + newPassword + "\"";
        mvc.perform(patch("/api/user/update-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"" + password + "\",\"newPassword\":" + newPasswordJson + "}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors." + field).isString());
        verifyNoInteractions(users);
    }

    @Test
    void acceptsStrongNewPasswordsAndDoesNotApplyTheNewPolicyToTheCurrentPassword() throws Exception {
        for (String newPassword : new String[] { "Abcdef1!", "Ábcdef1!", "A".repeat(70) + "1!" }) {
            mvc.perform(patch("/api/user/update-password").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"password\":\"old123\",\"newPassword\":\"" + newPassword + "\"}"))
                    .andExpect(status().isNoContent());
        }
        verify(users, times(3)).updatePassword(argThat(request -> request.password().equals("old123")));
    }

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

    @ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({
        "pill, burgundy", "calendar, royal", "sofa, brown", "dog, turquoise", "palette, fuchsia"
    })
    void acceptsNewCategoryAppearanceOnCreateAndUpdate(String icon, String color) throws Exception {
        String body = "{\"name\":\" Minha categoria \",\"icon\":\"" + icon + "\",\"color\":\"" + color + "\"}";
        mvc.perform(post("/api/category/create").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(content().string(""));
        verify(categories).create(argThat(request -> request.name().equals("Minha categoria")
                && request.icon().equals(icon) && request.color().equals(color)));

        mvc.perform(put("/api/category/update/" + UUID).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNoContent()).andExpect(content().string(""));
        verify(categories).update(eq(java.util.UUID.fromString(UUID)), argThat(request ->
                request.icon().equals(icon) && request.color().equals(color)));
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
            Arguments.of("POST", "/api/auth/register", "{\"name\":\"Teste\",\"email\":\"a@example.com\",\"password\":\"abcdef1!\"}", "password"),
            Arguments.of("POST", "/api/auth/register", "{\"name\":\"Teste\",\"email\":\"a@example.com\",\"password\":\"Abcdefg!\"}", "password"),
            Arguments.of("POST", "/api/auth/register", "{\"name\":\"Teste\",\"email\":\"a@example.com\",\"password\":\"Abcdefg1\"}", "password"),
            Arguments.of("POST", "/api/auth/register", "{\"name\":\"Teste\",\"email\":\"a@example.com\",\"password\":\"Abcdef1 \"}", "password"),
            Arguments.of("POST", "/api/auth/register", "{\"name\":\"Teste\",\"email\":\"a@example.com\",\"password\":\"Abcdef1á\"}", "password"),
            Arguments.of("POST", "/api/auth/register", "{\"name\":\"Teste\",\"email\":\"a@example.com\",\"password\":\"" + "é".repeat(37) + "\"}", "password"),
            Arguments.of("POST", "/api/auth/login", "{\"email\":\"a@example.com\",\"password\":\"" + "a".repeat(73) + "\"}", "password"),
            Arguments.of("POST", "/api/auth/login", "{\"email\":\"" + "a".repeat(140) + "@example.com\",\"password\":\"secret123\"}", "email"),
            Arguments.of("POST", "/api/auth/refresh", "{}", "refreshToken"),
            Arguments.of("POST", "/api/auth/refresh", "{\"refreshToken\":\"" + "a".repeat(4097) + "\"}", "refreshToken"),
            Arguments.of("POST", "/api/auth/logout", "{\"refreshToken\":\"   \"}", "refreshToken"),
            Arguments.of("PUT", "/api/user/update", "{}", "name"),
            Arguments.of("PUT", "/api/user/update", "{\"name\":\"   \",\"email\":\"a@example.com\"}", "name"),
            Arguments.of("PUT", "/api/user/update", "{\"name\":\" A \",\"email\":\"a@example.com\"}", "name"),
            Arguments.of("PUT", "/api/user/update", "{\"name\":\"" + "a".repeat(101) + "\",\"email\":\"a@example.com\"}", "name"),
            Arguments.of("PUT", "/api/user/update", "{\"name\":\"Teste\",\"email\":\"invalid\"}", "email"),
            Arguments.of("PUT", "/api/user/update", "{\"name\":\"Teste\"}", "email"),
            Arguments.of("PUT", "/api/user/update", "{\"name\":\"Teste\",\"email\":\"" + "a".repeat(140) + "@example.com\"}", "email")
        );
    }

    @ParameterizedTest
    @MethodSource("invalidRequests")
    void rejectsInvalidRequestsBeforeCallingServices(String method, String path, String body, String field) throws Exception {
        mvc.perform(request(HttpMethod.valueOf(method), path).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors." + field).isString());
        verifyNoInteractions(auth, accounts, categories, transactions, invoices, users);
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
        verify(auth).login(any(), eq("127.0.0.1"));
        verify(auth).logout("access-token");
    }

    @Test
    void acceptsExactStorageAndTranscriptionLimits() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"" + "a".repeat(100) + "\",\"email\":\"a@example.com\",\"password\":\"É" + "é".repeat(33) + "ab1!\"}"))
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
