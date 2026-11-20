package com.vikash_api.integrations.fuellog;
import java.security.Principal;
import java.util.*;
import com.vikash_api.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.HtmlUtils;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import jakarta.servlet.http.HttpServletRequest;

@RestController @RequiredArgsConstructor
@ConditionalOnProperty(name="integrations.fuellog.enabled",havingValue="true")
public class FuelLogConsentController {
    private final UserRepository users;
    private final RegisteredClientRepository clients;
    private final FuelLogAuthorizationStore authorizations;
    private static String esc(String s) { return HtmlUtils.htmlEscape(Objects.toString(s,"")); }
    private String csrf(HttpServletRequest request) {
        var token=(CsrfToken)request.getAttribute(CsrfToken.class.getName());
        return "<input type='hidden' name='_csrf' value='"+esc(token.getToken())+"'>";
    }
    private ResponseEntity<String> page(String body) { return page(body, List.of()); }
    private ResponseEntity<String> page(String body, List<String> redirects) {
        // Chromium checks form-action across the client's entire callback/return redirect chain.
        String callbackOrigin = redirects.stream().filter(value -> !value.isBlank()).map(value -> {
            var uri=java.net.URI.create(value);
            return " " + uri.getScheme() + "://" + uri.getRawAuthority();
        }).distinct().collect(java.util.stream.Collectors.joining());
        String html="""
            <!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <meta name="robots" content="noindex,nofollow"><title>Conectar FuelLog — ViKash</title>
            <style>html{color-scheme:dark}body{margin:0;background:#05060a;color:#f8fafc;font:16px system-ui,sans-serif}
            main{max-width:420px;margin:8vh auto;padding:24px}h1{font-size:30px}p,li{line-height:1.6;color:#b8bec9}
            label{display:block;margin:18px 0}input:not([type=checkbox]){box-sizing:border-box;width:100%;padding:15px;border:1px solid #727682;border-radius:14px;background:#22242e;color:#fff;font:inherit}
            button{width:100%;padding:16px;margin-top:12px;border:1px solid #e6a64c;border-radius:16px;background:#e6a64c;color:#141519;font:600 16px system-ui;cursor:pointer}
            button.secondary{background:transparent;color:#e6a64c}a{color:#e6a64c}input:focus-visible,button:focus-visible{outline:2px solid #e6a64c;outline-offset:3px}</style><main><strong>ViKash</strong>
            """+body+"</main></html>";
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("Referrer-Policy","no-referrer").header("X-Frame-Options","DENY")
            .header("Content-Security-Policy","default-src 'none'; style-src 'unsafe-inline'; form-action 'self'"+callbackOrigin+"; frame-ancestors 'none'; base-uri 'none'")
            .contentType(MediaType.TEXT_HTML).body(html);
    }
    @GetMapping("/connect/login")
    public ResponseEntity<String> login(HttpServletRequest request) {
        return page("<h1>Conectar ao FuelLog</h1><p>Entre na conta do ViKash que receberá os abastecimentos.</p>"
            +(request.getParameter("error")!=null?"<p role='alert'>Não foi possível entrar. Confira os dados e tente novamente.</p>":"")
            +"<form method='post' action='/connect/login'>"+csrf(request)
            +"<label>E-mail<input name='username' type='email' maxlength='150' autocomplete='username' required></label>"
            +"<label>Senha<input name='password' type='password' maxlength='100' autocomplete='current-password' required></label><button>Continuar</button></form>");
    }
    @GetMapping("/connect/consent")
    public ResponseEntity<String> consent(@RequestParam("client_id") String clientId,@RequestParam String state,
            @RequestParam String scope,Principal principal,HttpServletRequest request) {
        var client=clients.findByClientId(clientId);
        if(client==null) return ResponseEntity.badRequest().build();
        var user=users.findByUuid(UUID.fromString(principal.getName())).orElseThrow();
        String fields="<input type='hidden' name='client_id' value='"+esc(clientId)+"'><input type='hidden' name='state' value='"+esc(state)+"'>";
        for(String permission:scope.split(" ")) {
            if(!Set.of("fuellog.catalog","fuellog.entries").contains(permission)) return ResponseEntity.badRequest().build();
            fields+="<input type='hidden' name='scope' value='"+esc(permission)+"'>";
        }
        String identity="<h1>Autorizar FuelLog?</h1><p>Conta financeira: <strong>"+esc(user.getName())+"</strong></p>"
            +"<ul><li>Consultar categorias, contas e cartões disponíveis, sem saldos ou histórico.</li><li>Criar, consultar, alterar e cancelar somente os lançamentos deste vínculo.</li></ul>"
            +"<p>Abastecimentos antigos não serão importados automaticamente.</p>";
        return page(identity+"<form method='post' action='/oauth2/authorize'>"+csrf(request)+fields+"<button>Autorizar vínculo</button></form>"
            +"<form method='post' action='/oauth2/authorize'>"+csrf(request)+"<input type='hidden' name='client_id' value='"+esc(clientId)+"'><input type='hidden' name='state' value='"+esc(state)+"'><button class='secondary'>Cancelar</button></form>"
            +"<form method='post' action='/connect/switch'>"+csrf(request)+"<input type='hidden' name='state' value='"+esc(state)+"'><button class='secondary'>Usar outra conta do ViKash</button></form>", List.of(client.getRedirectUris().iterator().next(),
                    Objects.toString(client.getClientSettings().getSetting("fuellog.web-return-uri"),""),
                    Objects.toString(client.getClientSettings().getSetting("fuellog.native-return-uri"),"")));
    }
    @PostMapping("/connect/switch")
    @org.springframework.transaction.annotation.Transactional
    public void switchAccount(@RequestParam String state,Principal principal,HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {
        var pending=authorizations.findByToken(state,null);
        if(pending==null || !pending.getPrincipalName().equals(principal.getName()) || pending.getAccessToken()!=null) {
            response.sendError(400); return;
        }
        org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest original =
                pending.getAttribute(org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest.class.getName());
        if(original==null) { response.sendError(400); return; }
        var uri=org.springframework.web.util.UriComponentsBuilder.fromPath("/oauth2/authorize")
                .queryParam("response_type","code").queryParam("client_id",original.getClientId())
                .queryParam("redirect_uri",original.getRedirectUri()).queryParam("scope",String.join(" ",original.getScopes()))
                .queryParam("state",original.getState())
                .queryParam("code_challenge",original.getAdditionalParameters().get("code_challenge"))
                .queryParam("code_challenge_method","S256").build().encode().toUriString();
        authorizations.remove(pending);
        request.getSession().invalidate();
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        response.sendRedirect(uri);
    }
    @GetMapping("/connect/done")
    public ResponseEntity<String> done() { return page("<h1>Volte ao FuelLog</h1><p>Inicie a vinculação pelo FuelLog para escolher a conta e autorizar o acesso.</p>"); }
}
