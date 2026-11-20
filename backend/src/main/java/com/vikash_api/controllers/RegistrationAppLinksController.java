package com.vikash_api.controllers;

import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Public Android association metadata. GET never confirms or consumes an email token. */
@RestController
public class RegistrationAppLinksController {
    private final List<String> fingerprints;
    public RegistrationAppLinksController(@Value("${security.registration.android-cert-sha256}") String value) {
        fingerprints = Arrays.stream(value.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                .map(s -> s.toUpperCase(Locale.ROOT)).toList();
        if (fingerprints.stream().anyMatch(s -> !s.matches("[0-9A-F]{2}(:[0-9A-F]{2}){31}"))) {
            throw new IllegalArgumentException("Configure fingerprints SHA-256 válidos para os Android App Links.");
        }
    }
    @GetMapping(value = "/.well-known/assetlinks.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Map<String,Object>>> association() {
        List<Map<String,Object>> body = fingerprints.isEmpty() ? List.of() : List.of(Map.of(
                "relation", List.of("delegate_permission/common.handle_all_urls"),
                "target", Map.of("namespace", "android_app", "package_name", "com.vikash",
                        "sha256_cert_fingerprints", fingerprints)));
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS)).body(body);
    }
    @GetMapping("/verify-email")
    public ResponseEntity<Void> openApp(@RequestParam(required = false) String token) {
        String suffix = token != null && token.matches("[0-9a-fA-F-]{36}\\.[A-Za-z0-9_-]{43}")
                ? "?token=" + token : "";
        return ResponseEntity.status(302).location(URI.create("vikash://verify-email" + suffix))
                .cacheControl(CacheControl.noStore()).header("Referrer-Policy", "no-referrer").build();
    }
}
