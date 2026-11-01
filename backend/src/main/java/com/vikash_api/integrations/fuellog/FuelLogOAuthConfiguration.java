package com.vikash_api.integrations.fuellog;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.repositories.UserRepository;
import com.vikash_api.services.LoginAttemptService;
import com.vikash_api.exceptions.RequestLimitException;
import java.net.URI;
import java.time.Duration;
import java.util.*;
import java.util.function.Consumer;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.server.authorization.*;
import org.springframework.security.oauth2.server.authorization.authentication.*;
import org.springframework.security.oauth2.server.authorization.client.*;
import org.springframework.security.oauth2.server.authorization.settings.*;
import org.springframework.security.oauth2.server.authorization.token.*;
import org.springframework.security.oauth2.server.resource.introspection.OpaqueTokenIntrospector;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;

@Configuration
@ConditionalOnProperty(name="integrations.fuellog.enabled",havingValue="true")
public class FuelLogOAuthConfiguration {
    @Bean RegisteredClientRepository fuelLogClients(
            @Value("${integrations.fuellog.client-id:fuellog}") String id,
            @Value("${integrations.fuellog.client-secret-hash}") String secret,
            @Value("${integrations.fuellog.redirect-uri}") String redirect,
            @Value("${integrations.fuellog.web-return-uri:}") String webReturn,
            @Value("${integrations.fuellog.native-return-uri:}") String nativeReturn) {
        requireSecure(redirect);
        if (!webReturn.isBlank()) {
            requireSecure(webReturn);
            if (URI.create(webReturn).getRawQuery()!=null) throw new IllegalArgumentException("Configure o retorno web FuelLog exato, sem query.");
        }
        if (!nativeReturn.isBlank()) {
            var uri=URI.create(nativeReturn);
            if (!"fuellog".equals(uri.getScheme()) || uri.getHost()==null || uri.getUserInfo()!=null
                    || uri.getPort()!=-1 || uri.getRawQuery()!=null || uri.getFragment()!=null)
                throw new IllegalArgumentException("Configure um retorno nativo fuellog:// exato.");
        }
        if (secret.isBlank()) throw new IllegalArgumentException("Configure o hash do secret FuelLog.");
        var client = RegisteredClient.withId("fuellog").clientId(id).clientName("FuelLog")
                .clientSecret(secret).clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE).authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
                .redirectUri(redirect).scope("fuellog.catalog").scope("fuellog.entries")
                .clientSettings(ClientSettings.builder().requireProofKey(true).requireAuthorizationConsent(true)
                    .setting("fuellog.web-return-uri",webReturn).setting("fuellog.native-return-uri",nativeReturn).build())
                .tokenSettings(TokenSettings.builder().accessTokenFormat(OAuth2TokenFormat.REFERENCE)
                    .authorizationCodeTimeToLive(Duration.ofMinutes(5)).accessTokenTimeToLive(Duration.ofMinutes(5))
                    .refreshTokenTimeToLive(Duration.ofDays(30)).reuseRefreshTokens(false).build()).build();
        return new InMemoryRegisteredClientRepository(client);
    }
    static void requireSecure(String value) {
        var uri = URI.create(value);
        boolean loopback = Set.of("localhost","127.0.0.1","::1","[::1]").contains(Objects.toString(uri.getHost(),""));
        if ((!"https".equals(uri.getScheme()) && !("http".equals(uri.getScheme()) && loopback))
                || uri.getHost()==null || uri.getFragment()!=null || uri.getUserInfo()!=null)
            throw new IllegalArgumentException("OAuth requer URL HTTPS exata, ou loopback no desenvolvimento.");
    }
    @Bean FuelLogAuthorizationStore fuelLogAuthorizationStore(DataSource source, RegisteredClientRepository clients) {
        new ResourceDatabasePopulator(new ClassPathResource("integrations/oauth2-authorization.sql")).execute(source);
        var jdbc = new JdbcTemplate(source);
        return new FuelLogAuthorizationStore(new JdbcOAuth2AuthorizationService(jdbc,clients),jdbc);
    }
    @Bean AuthorizationServerSettings fuelLogSettings(@Value("${integrations.fuellog.issuer}") String issuer) {
        requireSecure(issuer); return AuthorizationServerSettings.builder().issuer(issuer).build();
    }
    @Bean OAuth2AuthorizationConsentService fuelLogConsent() {
        // Scope approval lives on each persisted authorization, never reused for a new grant.
        return new OAuth2AuthorizationConsentService() {
            public void save(OAuth2AuthorizationConsent c) {}
            public void remove(OAuth2AuthorizationConsent c) {}
            public OAuth2AuthorizationConsent findById(String client,String principal) { return null; }
        };
    }
    @Bean OAuth2TokenGenerator<?> fuelLogTokenGenerator() {
        return new DelegatingOAuth2TokenGenerator(new OAuth2AccessTokenGenerator(),new OAuth2RefreshTokenGenerator());
    }
    @Bean OpaqueTokenIntrospector fuelLogIntrospector(FuelLogAuthorizationStore store,UserRepository users) {
        return token -> {
            var grant = store.active(token);
            var user = users.findByUuid(UUID.fromString(grant.getPrincipalName())).filter(UserEntity::isEnabled)
                    .orElseThrow(() -> new org.springframework.security.oauth2.server.resource.introspection.BadOpaqueTokenException("Conta indisponível."));
            var attributes = new HashMap<String,Object>();
            attributes.put("sub",user.getUuid().toString()); attributes.put("authorization_id",grant.getId());
            attributes.put("scope",grant.getAccessToken().getToken().getScopes());
            return new DefaultOAuth2AuthenticatedPrincipal(user.getUuid().toString(),attributes,
                    grant.getAccessToken().getToken().getScopes().stream().<org.springframework.security.core.GrantedAuthority>map(scope -> new SimpleGrantedAuthority("SCOPE_"+scope)).toList());
        };
    }
    @Bean @Order(0)
    SecurityFilterChain fuelLogAuthorizationChain(HttpSecurity http,FuelLogAuthorizationStore store,
            RegisteredClientRepository clients, AuthorizationServerSettings settings,OAuth2AuthorizationConsentService consent,
            OAuth2TokenGenerator<?> generator,UserRepository users,PasswordEncoder encoder,PlatformTransactionManager manager,
            LoginAttemptService limits) throws Exception {
        http.securityMatcher("/oauth2/**","/.well-known/oauth-authorization-server","/connect/**")
            .oauth2AuthorizationServer(server -> server.registeredClientRepository(clients).authorizationService(store)
                .clientAuthentication(clientAuth -> clientAuth.authenticationProviders(providers -> providers.forEach(provider -> {
                    if(provider instanceof ClientSecretAuthenticationProvider secretProvider)
                        secretProvider.setPasswordEncoder(org.springframework.security.crypto.factory.PasswordEncoderFactories.createDelegatingPasswordEncoder());
                })))
                .authorizationServerSettings(settings).authorizationConsentService(consent).tokenGenerator(generator)
                .authorizationServerMetadataEndpoint(metadata -> metadata.authorizationServerMetadataCustomizer(builder ->
                    builder.grantTypes(types -> { types.clear(); types.add("authorization_code"); types.add("refresh_token"); })
                           .codeChallengeMethods(methods -> { methods.clear(); methods.add("S256"); })))
                .authorizationEndpoint(endpoint -> endpoint.consentPage("/connect/consent").authenticationProviders(providers ->
                    providers.forEach(provider -> {
                        if (provider instanceof OAuth2AuthorizationCodeRequestAuthenticationProvider code) {
                            Consumer<OAuth2AuthorizationCodeRequestAuthenticationContext> strict = context -> {
                                OAuth2AuthorizationCodeRequestAuthenticationToken request = context.getAuthentication();
                                if (!"S256".equals(request.getAdditionalParameters().get("code_challenge_method"))
                                        || request.getState()==null || request.getState().length()<20 || request.getState().length()>200)
                                    throw new OAuth2AuthorizationCodeRequestAuthenticationException(new OAuth2Error("invalid_request"),request);
                            };
                            code.setAuthenticationValidator(OAuth2AuthorizationCodeRequestAuthenticationValidator.DEFAULT_REDIRECT_URI_VALIDATOR
                                    .andThen(OAuth2AuthorizationCodeRequestAuthenticationValidator.DEFAULT_SCOPE_VALIDATOR).andThen(strict));
                        }
                    }))))
            .csrf(csrf -> csrf.addObjectPostProcessor(new org.springframework.security.config.ObjectPostProcessor<org.springframework.security.web.csrf.CsrfFilter>() {
                public <O extends org.springframework.security.web.csrf.CsrfFilter> O postProcess(O filter) {
                    filter.setRequireCsrfProtectionMatcher(request ->
                        org.springframework.security.web.csrf.CsrfFilter.DEFAULT_CSRF_MATCHER.matches(request)
                        && !Set.of("/oauth2/token","/oauth2/revoke","/oauth2/introspect").contains(request.getServletPath()));
                    return filter;
                }
            }))
            .authorizeHttpRequests(auth -> auth.requestMatchers("/connect/login").permitAll().anyRequest().authenticated())
            .exceptionHandling(ex -> ex.authenticationEntryPoint(new LoginUrlAuthenticationEntryPoint("/connect/login")))
            .formLogin(login -> login.loginPage("/connect/login").loginProcessingUrl("/connect/login")
                .defaultSuccessUrl("/connect/done",false).failureUrl("/connect/login?error"))
            .logout(logout -> logout.logoutUrl("/connect/logout").logoutSuccessUrl("/connect/login"));
        var provider = new DaoAuthenticationProvider(email -> {
            var user = users.findByEmail(email.trim().toLowerCase(Locale.ROOT)).filter(UserEntity::isEnabled)
                    .orElseThrow(() -> new UsernameNotFoundException("Credenciais inválidas."));
            return User.withUsername(user.getUuid().toString()).password(user.getPassword()).authorities("ROLE_USER").build();
        });
        provider.setPasswordEncoder(encoder); http.authenticationProvider(provider);
        http.addFilterBefore(new FuelLogOAuthTransactionFilter(manager),UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(new OncePerRequestFilter() {
            @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws IOException,ServletException {
                if (request.getMethod().equals("POST") && request.getServletPath().equals("/connect/login")) {
                    String email=Objects.toString(request.getParameter("username"),"");
                    if(email.length()>150) { response.sendError(400); return; }
                    try { limits.check(email,request.getRemoteAddr()); }
                    catch (RequestLimitException e) { response.sendError(429); return; }
                }
                chain.doFilter(request,response);
            }
        },UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
    @Bean @Order(1)
    SecurityFilterChain fuelLogResourceChain(HttpSecurity http,OpaqueTokenIntrospector introspector) throws Exception {
        http.securityMatcher("/api/integrations/**")
            .csrf(csrf -> csrf.disable()).sessionManagement(session -> session.sessionCreationPolicy(org.springframework.security.config.http.SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.requestMatchers("/api/integrations/v1/fuellog/catalog").hasAuthority("SCOPE_fuellog.catalog")
                .requestMatchers("/api/integrations/v1/fuellog/refuelings/**").hasAuthority("SCOPE_fuellog.entries").anyRequest().denyAll())
            .oauth2ResourceServer(resource -> resource.opaqueToken(token -> token.introspector(introspector)));
        return http.build();
    }
}
