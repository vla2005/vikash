package com.vikash_api.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.RestClient;
import com.vikash_api.support.VerifiedUserFixture;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.entities.AccountEntity;
import com.vikash_api.enums.AccountType;
import com.vikash_api.repositories.AccountRepository;
import com.vikash_api.repositories.UserRepository;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:debts;DB_CLOSE_DELAY=-1")
class DebtIntegrationTest extends VerifiedUserFixture {
    @LocalServerPort int port;
    @Autowired AccountRepository accounts;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate jdbc;
    RestClient client;
    String token;
    UUID accountUuid;

    @BeforeEach
    void setup() {
        client = RestClient.create("http://localhost:" + port);
        var owner = createUser();
        token = owner.getAccessToken();
        accountUuid = createAccount(owner);
        jdbc.update("""
                INSERT INTO default_categories (name, icon, color)
                SELECT 'Pagamento de dívida', 'wallet', 'gray'
                WHERE NOT EXISTS (SELECT 1 FROM default_categories WHERE name = 'Pagamento de dívida')
                """);
    }

    @Test
    void registersAnOngoingDebtAndMarksAnInstallmentOnce() {
        UUID uuid = UUID.randomUUID();
        var input = request(uuid, "1400.00", 3, 2, "2027-01-31");
        var debt = create(input);
        assertThat(debt.description()).isEqualTo("Empréstimo pessoal");
        assertThat(debt.paidInstallments()).isEqualTo(2);
        assertThat(debt.installments()).containsExactly(new Installment(3, LocalDate.of(2027, 1, 31),
                new BigDecimal("466.66")));
        assertThat(create(input)).isEqualTo(debt);
        assertThat(createStatus(request(uuid, "1500.00", 3, 2, "2027-01-31"))).isEqualTo(409);
        assertThat(list(token).debts()).containsExactly(debt);
        assertThat(list(newUser()).debts()).isEmpty();
        assertThat(paymentStatus(uuid, 3, newUser())).isEqualTo(404);
        assertThat(paymentStatus(uuid, 2, token)).isEqualTo(400);

        assertThat(paymentStatus(uuid, 3, token, debt.version())).isEqualTo(200);
        assertThat(paymentStatus(uuid, 3, token, debt.version())).isEqualTo(200);
        var paid = list(token).debts()[0];
        assertThat(paid.paidInstallments()).isEqualTo(3);
        assertThat(paid.installments()).isEmpty();
        assertThat(paid.hasRecordedPayments()).isTrue();
        assertThat(accounts.findByUuid(accountUuid).orElseThrow().getBalance()).isEqualByComparingTo("533.34");
        var statement = client.get().uri("/api/transaction").header("Authorization", "Bearer " + token)
                .retrieve().body(Statement.class);
        assertThat(statement.content()).hasSize(1);
        var entry = statement.content().getFirst();
        assertThat(entry.categoryName()).isEqualTo("Pagamento de dívida");
        assertThat(entry.type()).isEqualTo("EXPENSE");
        assertThat(entry.amount()).isEqualByComparingTo("466.66");
        assertThat(entry.debtPayment()).isTrue();
        int reversal = client.delete().uri("/api/transaction/{uuid}", entry.uuid())
                .header("Authorization", "Bearer " + token)
                .exchange((request, response) -> response.getStatusCode().value());
        assertThat(reversal).isEqualTo(204);
        assertThat(list(token).debts()[0].paidInstallments()).isEqualTo(2);
        assertThat(list(token).debts()[0].hasRecordedPayments()).isFalse();
        assertThat(accounts.findByUuid(accountUuid).orElseThrow().getBalance()).isEqualByComparingTo("1000.00");
    }

    @Test
    void preservesTheDueDayAndAllocatesRoundingWithoutLosingCents() {
        UUID uuid = UUID.randomUUID();
        var input = request(uuid, "100.00", 3, 0, "2027-01-31");
        var debt = create(input);
        assertThat(debt.installments()).containsExactly(
                new Installment(1, LocalDate.of(2027, 1, 31), new BigDecimal("33.34")),
                new Installment(2, LocalDate.of(2027, 2, 28), new BigDecimal("33.33")),
                new Installment(3, LocalDate.of(2027, 3, 31), new BigDecimal("33.33")));
        assertThat(paymentStatus(uuid, 2, token)).isEqualTo(400);
        assertThat(paymentStatus(uuid, 1, token)).isEqualTo(200);
        assertThat(paymentStatus(uuid, 1, token)).isEqualTo(200);
        assertThat(list(token).debts()[0].installments()).containsExactly(debt.installments().get(1), debt.installments().get(2));
    }

    @Test
    void rejectsInvalidProgressAndAmountsAndRequiresAuthentication() {
        assertThat(createStatus(request(UUID.randomUUID(), "10.00", 3, 3, "2027-01-31"))).isEqualTo(400);
        assertThat(createStatus(request(UUID.randomUUID(), "0.01", 3, 0, "2027-01-31"))).isEqualTo(400);
        assertThat(createStatus(request(UUID.randomUUID(), "10.00", 3, 0, "2027-02-30"))).isEqualTo(400);
        assertThat(list(token).debts()).isEmpty();
        int unauthorized = client.get().uri("/api/debt").exchange((request, response) -> response.getStatusCode().value());
        assertThat(unauthorized).isEqualTo(401);
    }

    @Test
    void editsAnOngoingDebtWithoutChangingTheExistingDueDayAndRejectsStaleChanges() {
        UUID uuid = UUID.randomUUID();
        var original = create(request(uuid, "120.00", 3, 0, "2027-01-31"));
        assertThat(paymentStatus(uuid, 1, token)).isEqualTo(200);
        var current = list(token).debts()[0];
        var edit = new HashMap<>(request(uuid, "120.00", 3, 1, "2027-02-28"));
        edit.put("description", "Descrição revisada");
        edit.put("version", original.version());
        assertThat(updateStatus(uuid, edit, token)).isEqualTo(409);
        edit.put("version", current.version());
        assertThat(updateStatus(uuid, edit, newUser())).isEqualTo(404);
        assertThat(updateStatus(uuid, edit, token)).isEqualTo(200);
        assertThat(updateStatus(uuid, edit, token)).isEqualTo(200);
        var edited = list(token).debts()[0];
        assertThat(edited.description()).isEqualTo("Descrição revisada");
        assertThat(edited.installments()).containsExactly(
                new Installment(2, LocalDate.of(2027, 2, 28), new BigDecimal("40.00")),
                new Installment(3, LocalDate.of(2027, 3, 31), new BigDecimal("40.00")));
        assertThat(paymentStatus(uuid, 2, token, current.version())).isEqualTo(409);
        assertThat(paymentStatus(uuid, 2, token, edited.version())).isEqualTo(200);
        var changePlan = new HashMap<>(request(uuid, "150.00", 3, 0, "2027-02-28"));
        changePlan.put("version", list(token).debts()[0].version());
        assertThat(updateStatus(uuid, changePlan, token)).isEqualTo(400);
    }

    @Test
    void requiresOwnAccountAndAnExactlyNamedDefaultCategoryBeforeChangingAnything() {
        UUID uuid = UUID.randomUUID();
        var debt = create(request(uuid, "100.00", 1, 0, "2027-01-31"));
        UUID otherAccount = createAccount(createUser());
        assertThat(paymentStatus(uuid, 1, token, debt.version(), otherAccount)).isEqualTo(400);
        jdbc.update("UPDATE default_categories SET name = ? WHERE name = ?", "Pagamento de Dívida", "Pagamento de dívida");
        try {
            assertThat(paymentStatus(uuid, 1, token, debt.version())).isEqualTo(422);
            assertThat(list(token).debts()).containsExactly(debt);
            assertThat(accounts.findByUuid(accountUuid).orElseThrow().getBalance()).isEqualByComparingTo("1000.00");
            assertThat(accounts.findByUuid(otherAccount).orElseThrow().getBalance()).isEqualByComparingTo("1000.00");
            var statement = client.get().uri("/api/transaction").header("Authorization", "Bearer " + token)
                    .retrieve().body(Statement.class);
            assertThat(statement.content()).isEmpty();
        } finally {
            jdbc.update("UPDATE default_categories SET name = ? WHERE name = ?", "Pagamento de dívida", "Pagamento de Dívida");
        }
    }

    @Test
    void correctsProgressAndEditsASettledDebt() {
        UUID uuid = UUID.randomUUID();
        var original = create(request(uuid, "120.00", 3, 1, "2027-02-28"));
        var edit = new HashMap<>(request(uuid, "120.00", 3, 0, "2027-04-15"));
        edit.put("version", original.version());
        assertThat(updateStatus(uuid, edit, token)).isEqualTo(200);
        var reopened = list(token).debts()[0];
        assertThat(reopened.paidInstallments()).isZero();
        assertThat(reopened.installments()).extracting(Installment::dueDate).containsExactly(
                LocalDate.of(2027, 4, 15), LocalDate.of(2027, 5, 15), LocalDate.of(2027, 6, 15));

        edit.put("version", reopened.version());
        edit.put("paidInstallments", 3);
        edit.remove("nextDueDate");
        assertThat(updateStatus(uuid, edit, token)).isEqualTo(200);
        var settled = list(token).debts()[0];
        assertThat(settled.installments()).isEmpty();
        edit.put("version", settled.version());
        edit.put("description", "Quitada por antecipação");
        assertThat(updateStatus(uuid, edit, token)).isEqualTo(200);
        assertThat(list(token).debts()[0].description()).isEqualTo("Quitada por antecipação");
    }

    private String newUser() {
        return createUser().getAccessToken();
    }

    private AuthResponse createUser() {
        return createTestUser(Map.of("name", "Teste", "email", UUID.randomUUID() + "@debts.test",
                "password", "Password123!"));
    }

    private UUID createAccount(AuthResponse owner) {
        var account = new AccountEntity();
        account.setUser(users.findByUuid(owner.getUser().getUuid()).orElseThrow());
        account.setType(AccountType.CARTEIRA);
        account.setDescription("Carteira teste");
        account.setBalance(new BigDecimal("1000.00"));
        account.setActive(true);
        return accounts.save(account).getUuid();
    }

    private Map<String, Object> request(UUID uuid, String amount, int installments, int paid, String dueDate) {
        return Map.of("uuid", uuid, "creditor", "Fulano", "description", " Empréstimo pessoal ",
                "totalAmount", new BigDecimal(amount), "installmentCount", installments,
                "paidInstallments", paid, "nextDueDate", dueDate);
    }

    private RestClient.RequestBodySpec createRequest(Map<String, Object> input) {
        return client.post().uri("/api/debt/create").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).body(input);
    }

    private Debt create(Map<String, Object> input) {
        return createRequest(input).exchange((request, response) -> {
            assertThat(response.getStatusCode().value()).isEqualTo(201);
            return response.bodyTo(Debt.class);
        });
    }

    private int createStatus(Map<String, Object> input) {
        return createRequest(input).exchange((request, response) -> response.getStatusCode().value());
    }

    private int paymentStatus(UUID uuid, int number, String accessToken) {
        return paymentStatus(uuid, number, accessToken, list(token).debts()[0].version());
    }

    private int paymentStatus(UUID uuid, int number, String accessToken, long version) {
        return paymentStatus(uuid, number, accessToken, version, accountUuid);
    }

    private int paymentStatus(UUID uuid, int number, String accessToken, long version, UUID payingAccount) {
        return client.put().uri("/api/debt/{uuid}/installments/{number}/payment", uuid, number)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON).body(Map.of("accountUuid", payingAccount, "version", version))
                .exchange((request, response) -> response.getStatusCode().value());
    }

    private int updateStatus(UUID uuid, Map<String, Object> input, String accessToken) {
        return client.put().uri("/api/debt/update/{uuid}", uuid).header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON).body(input)
                .exchange((request, response) -> response.getStatusCode().value());
    }

    private Debts list(String accessToken) {
        return client.get().uri("/api/debt").header("Authorization", "Bearer " + accessToken)
                .retrieve().body(Debts.class);
    }

    record Debts(Debt[] debts) {}
    record Statement(java.util.List<StatementEntry> content) {}
    record StatementEntry(UUID uuid, String categoryName, String type, BigDecimal amount, boolean debtPayment) {}
    record Debt(UUID uuid, String creditor, String description, BigDecimal totalAmount, int installmentCount,
            int paidInstallments, java.util.List<Installment> installments, long version, boolean hasRecordedPayments) {}
    record Installment(int number, LocalDate dueDate, BigDecimal amount) {}
}
