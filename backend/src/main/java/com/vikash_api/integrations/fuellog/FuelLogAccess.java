package com.vikash_api.integrations.fuellog;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthentication;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.util.UUID;

@Service @RequiredArgsConstructor
@ConditionalOnProperty(name="integrations.fuellog.enabled",havingValue="true")
public class FuelLogAccess {
    private final FuelLogAuthorizationStore store;
    private final UserRepository users;
    public record Identity(UserEntity user, String authorizationId) {}
    @Transactional(propagation=Propagation.MANDATORY)
    public Identity lock() {
        if (!(SecurityContextHolder.getContext().getAuthentication() instanceof BearerTokenAuthentication bearer))
            throw new AccessDeniedException("Credencial delegada obrigatória.");
        String id = bearer.getTokenAttributes().get("authorization_id").toString();
        store.lockId(id);
        org.springframework.security.oauth2.server.authorization.OAuth2Authorization grant;
        try { grant = store.active(bearer.getToken().getTokenValue()); }
        catch (org.springframework.security.oauth2.server.resource.introspection.BadOpaqueTokenException e) {
            throw new FuelLogException(401,"invalid_token","Credencial inválida ou expirada.");
        }
        if (!id.equals(grant.getId())) throw new AccessDeniedException("Vínculo inválido.");
        var user = users.findByUuid(UUID.fromString(grant.getPrincipalName()))
                .filter(UserEntity::isEnabled).orElseThrow(() -> new AccessDeniedException("Conta indisponível."));
        return new Identity(user, id);
    }
}
