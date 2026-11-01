package com.vikash_api.integrations.fuellog;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.server.authorization.*;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationCode;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import lombok.RequiredArgsConstructor;

/** Standard JDBC serialization; row locks protect protocol and financial operations. */
@RequiredArgsConstructor
public class FuelLogAuthorizationStore implements OAuth2AuthorizationService {
    private final JdbcOAuth2AuthorizationService delegate;
    private final JdbcTemplate jdbc;
    public void lockId(String id) {
        jdbc.queryForList("select id from oauth2_authorization where id = ? for update", String.class, id);
    }
    @Override public void save(OAuth2Authorization authorization) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) lockId(authorization.getId());
        var existing = delegate.findById(authorization.getId());
        if (existing != null && Boolean.TRUE.equals(existing.getAttribute("fuellog.revoked"))) {
            if (Boolean.TRUE.equals(authorization.getAttribute("fuellog.revoked"))) return;
            throw new OAuth2AuthenticationException(new OAuth2Error("invalid_grant"));
        }
        boolean revoked = (authorization.getAccessToken() != null && authorization.getAccessToken().isInvalidated())
                || (authorization.getRefreshToken() != null && authorization.getRefreshToken().isInvalidated());
        if (revoked) {
            var builder = OAuth2Authorization.from(authorization).attribute("fuellog.revoked", true);
            if(authorization.getAccessToken()!=null) builder.invalidate(authorization.getAccessToken().getToken());
            if(authorization.getRefreshToken()!=null) builder.invalidate(authorization.getRefreshToken().getToken());
            var code=authorization.getToken(OAuth2AuthorizationCode.class);
            if(code!=null) builder.invalidate(code.getToken());
            authorization = builder.build();
        }
        delegate.save(authorization);
    }
    @Override public void remove(OAuth2Authorization authorization) { lockId(authorization.getId()); delegate.remove(authorization); }
    @Override public OAuth2Authorization findById(String id) { return delegate.findById(id); }
    @Override public OAuth2Authorization findByToken(String token, OAuth2TokenType type) {
        if (token == null || token.length() > 4096) return null;
        if (TransactionSynchronizationManager.isActualTransactionActive())
            jdbc.queryForList("select id from oauth2_authorization where authorization_code_value = ? or access_token_value = ? or refresh_token_value = ? or state = ? for update",
                    String.class, token, token, token, token);
        return delegate.findByToken(token, type);
    }
    public OAuth2Authorization active(String token) {
        var grant = findByToken(token, OAuth2TokenType.ACCESS_TOKEN);
        if (grant == null || Boolean.TRUE.equals(grant.getAttribute("fuellog.revoked"))
                || grant.getAccessToken() == null || !grant.getAccessToken().isActive())
            throw new org.springframework.security.oauth2.server.resource.introspection.BadOpaqueTokenException("Credencial inválida ou expirada.");
        return grant;
    }
}
