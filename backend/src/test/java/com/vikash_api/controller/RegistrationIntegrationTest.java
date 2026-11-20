package com.vikash_api.controller;

import com.vikash_api.dtos.requests.*;
import com.vikash_api.dtos.responses.*;
import com.vikash_api.entities.RegistrationChallengeEntity;
import com.vikash_api.repositories.*;
import com.vikash_api.services.RegistrationService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import jakarta.mail.Session;
import jakarta.mail.Part;
import jakarta.mail.Multipart;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.RestClient;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.Pattern;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:registration;DB_CLOSE_DELAY=-1")
class RegistrationIntegrationTest extends com.vikash_api.support.VerifiedUserFixture {
    @Autowired org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor mailExecutor;
    @org.junit.jupiter.api.AfterEach void awaitMailCompletion() throws Exception {
        com.vikash_api.support.AsyncTestSupport.awaitIdle(mailExecutor);
    }
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired RefreshTokenRepository sessions;
    @Autowired RegistrationChallengeRepository challenges;
    @Autowired PasswordEncoder encoder;
    @Autowired RegistrationService registration;
    @MockitoBean JavaMailSender mail;
    RestClient client;
    BlockingQueue<MimeMessage> sent;

    @BeforeEach void setup() {
        client = RestClient.create("http://localhost:" + port);
        sent = new LinkedBlockingQueue<>();
        reset(mail);
        when(mail.createMimeMessage()).thenAnswer(invocation -> {
            Properties properties = new Properties();
            properties.setProperty("mail.from", "no-reply@example.test");
            properties.setProperty("mail.host", "localhost");
            return new MimeMessage(Session.getInstance(properties));
        });
        doAnswer(invocation -> { MimeMessage message = invocation.getArgument(0, MimeMessage.class); message.saveChanges(); sent.add(message); return null; })
                .when(mail).send(any(MimeMessage.class));
    }
    RegisterRequest input(String email) { return new RegisterRequest("Novo usuário", email, "Password123!"); }
    RegistrationResponse request(RegisterRequest input) {
        var response = client.post().uri("/api/auth/register").contentType(MediaType.APPLICATION_JSON).body(input)
                .retrieve().toEntity(RegistrationResponse.class);
        assertThat(response.getStatusCode().value()).isEqualTo(202);
        assertThat(response.getBody().expiresIn()).isEqualTo(900);
        return response.getBody();
    }
    String code() throws Exception {
        var message = sent.poll(5, TimeUnit.SECONDS);
        assertThat(message).isNotNull();
        var matcher = Pattern.compile("[0-9]{8}").matcher(content(message, "text/plain"));
        assertThat(matcher.find()).isTrue();
        return matcher.group();
    }
    int confirm(UUID id, String code) {
        return client.post().uri("/api/auth/register/confirm").contentType(MediaType.APPLICATION_JSON)
                .body(new ConfirmRegistrationRequest(id, code)).exchange((req, response) -> response.getStatusCode().value());
    }
    RegistrationChallengeEntity ready(UUID id) throws Exception {
        for (int i=0; i<100; i++) {
            var found=challenges.findById(id);
            if(found.isPresent()) return found.get();
            Thread.sleep(20);
        }
        throw new AssertionError("Pending challenge was not committed");
    }

    String content(Part part, String type) throws Exception {
        if (part.isMimeType(type)) return part.getContent().toString();
        if (part.getContent() instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                String value = content(multipart.getBodyPart(i), type);
                if (!value.isEmpty()) return value;
            }
        }
        return "";
    }
    String linkToken() throws Exception {
        var message = sent.poll(5, TimeUnit.SECONDS);
        assertThat(message).isNotNull();
        String html = content(message, "text/html");
        assertThat(html).contains("Abrir ViKash e verificar", "https://api-vikash.viktorware.com/verify-email?token=");
        var matcher = Pattern.compile("token=([0-9a-f-]{36}\\.[A-Za-z0-9_-]{43})").matcher(html);
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }
    int verifyLink(String token) {
        return client.post().uri("/api/auth/register/verify-link").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("token", token)).exchange((req, res) -> res.getStatusCode().value());
    }

    @Test void emailLinkConfirmsOnlyOnceWithoutCreatingSessionAndAllowsPasswordLogin() throws Exception {
        String email = UUID.randomUUID()+"@example.com";
        var pending = request(input(email)); String token = linkToken(); var before = ready(pending.challengeId());
        assertThat(token).startsWith(pending.challengeId()+".");
        assertThat(before.getLinkTokenHash()).hasSize(64).doesNotContain(token.substring(37));
        assertThat(users.findByEmail(email)).isEmpty();
        long previousSessions = sessions.count();
        assertThat(verifyLink(token)).isEqualTo(204);
        var user = users.findByEmail(email).orElseThrow();
        assertThat(sessions.count()).isEqualTo(previousSessions);
        assertThat(verifyLink(token)).isEqualTo(400);
        var consumed = challenges.findById(pending.challengeId()).orElseThrow();
        assertThat(consumed.getUsedAt()).isNotNull(); assertThat(consumed.getLinkTokenHash()).isNull();
        assertThat(consumed.getPasswordHash()).isEmpty(); assertThat(consumed.getCodeHash()).isEmpty();
        var auth = client.post().uri("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .body(new LoginRequest(email,"Password123!")).retrieve().body(AuthResponse.class);
        assertThat(auth.getUser().getUuid()).isEqualTo(user.getUuid());
    }

    @Test void linkPreviewOnlyOpensTheAppAndNeverConsumesTheToken() throws Exception {
        var pending = request(input(UUID.randomUUID()+"@example.com")); String token = linkToken(); ready(pending.challengeId());
        var http = java.net.http.HttpClient.newBuilder().followRedirects(java.net.http.HttpClient.Redirect.NEVER).build();
        var response = http.send(java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://localhost:"+port+"/verify-email?token="+token)).GET().build(), java.net.http.HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(302);
        assertThat(response.headers().firstValue("Location")).contains("vikash://verify-email?token="+token);
        assertThat(response.body()).isEmpty();
        assertThat(challenges.findById(pending.challengeId()).orElseThrow().getUsedAt()).isNull();
        assertThat(verifyLink(token)).isEqualTo(204);
    }

    @Test void expiredAlteredAndCrossChallengeLinksCannotCreateAccounts() throws Exception {
        var a = request(input(UUID.randomUUID()+"@example.com")); String aToken = linkToken(); ready(a.challengeId());
        var b = request(input(UUID.randomUUID()+"@example.com")); String bToken = linkToken(); var bRecord = ready(b.challengeId());
        assertThat(verifyLink(b.challengeId()+aToken.substring(36))).isEqualTo(400);
        assertThat(verifyLink(aToken.substring(0,37)+"z".repeat(43))).isEqualTo(400);
        bRecord.setExpiresAt(Instant.now().minusSeconds(1)); challenges.saveAndFlush(bRecord);
        assertThat(verifyLink(bToken)).isEqualTo(400);
        assertThat(users.findByEmail(bRecord.getEmail())).isEmpty();
        assertThat(verifyLink(aToken)).isEqualTo(204);
    }

    @Test void onlyOneConcurrentLinkVerificationCanConsumeAChallenge() throws Exception {
        var pending = request(input(UUID.randomUUID()+"@example.com")); String token = linkToken(); ready(pending.challengeId());
        var executor = Executors.newFixedThreadPool(2);
        try {
            var results = executor.invokeAll(List.of(() -> verifyLink(token), () -> verifyLink(token)));
            assertThat(List.of(results.get(0).get(), results.get(1).get())).containsExactlyInAnyOrder(204, 400);
        } finally { executor.shutdownNow(); }
    }

    @Test void malformedLinkHasNoRedirectAndAndroidAssociationIsPublic() {
        assertThat(verifyLink("invalid")).isEqualTo(400);
        var response = client.get().uri("/.well-known/assetlinks.json").retrieve().toEntity(String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("delegate_permission/common.handle_all_urls", "com.vikash", "AA:AA:AA:AA");
        assertThat(response.getBody()).doesNotContain("accessToken", "refreshToken", "private");
    }

    @Test void newExistingAndNormalizedRequestsHaveEquivalentPublicResponse() throws Exception {
        String email=UUID.randomUUID()+"@example.com";
        createTestUser(input(email));
        String body="{\"name\":\"Novo usuário\",\"email\":\"%s\",\"password\":\"Password123!\"}";
        List<String> messages=new ArrayList<>();
        for(String candidate:List.of(email,email.toUpperCase(Locale.ROOT),UUID.randomUUID()+"@example.com")) {
            String result=client.post().uri("/api/auth/register").contentType(MediaType.APPLICATION_JSON).body(body.formatted(candidate))
                    .retrieve().body(String.class);
            assertThat(result).doesNotContain("accessToken","refreshToken","user","already in use");
            messages.add(result.replaceAll("[0-9a-f]{8}-[0-9a-f-]{27}","ID"));
        }
        assertThat(new HashSet<>(messages)).hasSize(1);
        assertThat(encoder.matches("Password123!",users.findByEmail(email).orElseThrow().getPassword())).isTrue();
    }

    @Test void proofIsRequiredBeforeAccountSessionOrLoginThenOnboardingWorks() throws Exception {
        String email=UUID.randomUUID()+"@example.com";
        var pending=request(input(email));String code=code();var stored=ready(pending.challengeId());
        assertThat(stored.getCodeHash()).hasSize(64).doesNotContain(code);
        assertThat(stored.getPasswordHash()).startsWith("$2");
        assertThat(users.findByEmail(email)).isEmpty();
        int login=client.post().uri("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .body(new LoginRequest(email,"Password123!")).exchange((req,res)->res.getStatusCode().value());
        assertThat(login).isEqualTo(401);
        var auth=client.post().uri("/api/auth/register/confirm").contentType(MediaType.APPLICATION_JSON)
                .body(new ConfirmRegistrationRequest(pending.challengeId(),code)).retrieve().body(AuthResponse.class);
        assertThat(auth.getUser().getEmail()).isEqualTo(email);
        assertThat(auth.getAccessToken()).isNotBlank();assertThat(auth.getRefreshToken()).isNotBlank();
        assertThat(client.get().uri("/api/auth/me").header("Authorization","Bearer "+auth.getAccessToken())
                .retrieve().toBodilessEntity().getStatusCode().value()).isEqualTo(200);
        assertThat(confirm(pending.challengeId(),code)).isEqualTo(400);
        var consumed=challenges.findById(pending.challengeId()).orElseThrow();
        assertThat(consumed.getPasswordHash()).isEmpty();assertThat(consumed.getCodeHash()).isEmpty();
    }

    @Test void invalidExpiredAndPreviouslyExhaustedCodesCannotCreateAccounts() throws Exception {
        for(String state:List.of("invalid","expired","exhausted")) {
            var pending=request(input(UUID.randomUUID()+"@example.com"));String code=code();var stored=ready(pending.challengeId());
            if(state.equals("expired")) stored.setExpiresAt(Instant.now().minusSeconds(1));
            if(state.equals("exhausted")) stored.setAttempts(5);
            challenges.saveAndFlush(stored);
            assertThat(confirm(pending.challengeId(),state.equals("invalid")?(code.equals("00000000")?"11111111":"00000000"):code)).isEqualTo(400);
            assertThat(users.findByEmail(stored.getEmail())).isEmpty();
            if(state.equals("invalid")) assertThat(challenges.findById(stored.getId()).orElseThrow().getAttempts()).isEqualTo(1);
        }
        assertThat(confirm(UUID.randomUUID(),"12345678")).isEqualTo(400);
    }

    @Test void fiveGuessesRemainExhaustedAcrossDifferentOrigins() throws Exception {
        var pending=request(input(UUID.randomUUID()+"@example.com"));String code=code();ready(pending.challengeId());
        String wrong=code.equals("00000000")?"11111111":"00000000";
        for(int i=0;i<5;i++) {
            final int attempt=i;
            assertThatThrownBy(()->registration.confirm(new ConfirmRegistrationRequest(pending.challengeId(),wrong),"origin-"+attempt))
                    .isInstanceOf(com.vikash_api.exceptions.RegistrationVerificationException.class);
        }
        assertThat(challenges.findById(pending.challengeId()).orElseThrow().getAttempts()).isEqualTo(5);
        assertThat(confirm(pending.challengeId(),code)).isEqualTo(429);
    }

    @Test void simultaneousConfirmationCreatesOnlyOneSession() throws Exception {
        var pending=request(input(UUID.randomUUID()+"@example.com"));String code=code();ready(pending.challengeId());
        long before=sessions.count();
        try(var pool=Executors.newFixedThreadPool(2)) {
            var start=new CountDownLatch(1);
            Callable<Integer> action=()->{start.await();return confirm(pending.challengeId(),code);};
            var a=pool.submit(action);var b=pool.submit(action);start.countDown();
            assertThat(List.of(a.get(5,TimeUnit.SECONDS),b.get(5,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,400);
        }
        assertThat(sessions.count()).isEqualTo(before+1);
    }

    @Test void twoValidChallengesForOneEmailCannotCreateOrOverwriteTwoUsers() throws Exception {
        String email=UUID.randomUUID()+"@example.com";
        var a=request(input(email));String aCode=code();ready(a.challengeId());
        var b=request(new RegisterRequest("Second",email,"AnotherPassword123!"));String bCode=code();ready(b.challengeId());
        try(var pool=Executors.newFixedThreadPool(2)) {
            var start=new CountDownLatch(1);
            var first=pool.submit(()->{start.await();return confirm(a.challengeId(),aCode);});
            var second=pool.submit(()->{start.await();return confirm(b.challengeId(),bCode);});start.countDown();
            assertThat(List.of(first.get(5,TimeUnit.SECONDS),second.get(5,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,400);
        }
        assertThat(users.findAll().stream().filter(user->user.getEmail().equals(email)).count()).isEqualTo(1);
    }

    @Test void existingUserCannotBeOverwrittenAfterPendingRequest() throws Exception {
        String email=UUID.randomUUID()+"@example.com";
        var pending=request(input(email));String code=code();ready(pending.challengeId());
        var existing=createTestUser(new RegisterRequest("Original",email,"OriginalPassword123!"));
        assertThat(confirm(pending.challengeId(),code)).isEqualTo(400);
        var current=users.findByEmail(email).orElseThrow();
        assertThat(current.getUuid()).isEqualTo(existing.getUser().getUuid());
        assertThat(current.getName()).isEqualTo("Original");
        assertThat(encoder.matches("OriginalPassword123!",current.getPassword())).isTrue();
    }

    @Test void codeIsBoundToItsChallengeAndMalformedValuesAreRejected() throws Exception {
        var a=request(input(UUID.randomUUID()+"@example.com"));String aCode=code();ready(a.challengeId());
        var b=request(input(UUID.randomUUID()+"@example.com"));String bCode=code();ready(b.challengeId());
        if(!aCode.equals(bCode)) assertThat(confirm(b.challengeId(),aCode)).isEqualTo(400);
        assertThat(confirm(a.challengeId(),"1234567a")).isEqualTo(400);
        assertThat(confirm(a.challengeId(),aCode)).isEqualTo(200);
    }

    @Test void smtpFailureDoesNotDiscloseEligibilityOrCreateAnAccount() throws Exception {
        String email=UUID.randomUUID()+"@example.com";
        doThrow(new MailSendException("synthetic failure")).when(mail).send(any(MimeMessage.class));
        var pending=request(input(email));
        verify(mail,timeout(5000)).send(any(MimeMessage.class));
        assertThat(users.findByEmail(email)).isEmpty();
        assertThat(confirm(pending.challengeId(),"00000000")).isEqualTo(400);
    }
}
