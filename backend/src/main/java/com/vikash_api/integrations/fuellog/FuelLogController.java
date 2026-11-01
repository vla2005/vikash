package com.vikash_api.integrations.fuellog;

import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/integrations/v1/fuellog")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "integrations.fuellog.enabled", havingValue = "true")
public class FuelLogController {
    private final FuelLogFinancialService service;

    @GetMapping("/catalog")
    public FuelLogResponses.Catalog catalog() { return service.catalog(); }

    @GetMapping("/refuelings/{externalId}")
    public ResponseEntity<FuelLogResponses.Refueling> get(@PathVariable String externalId) {
        var result = service.get(externalId);
        return ResponseEntity.ok().eTag(result.etag()).body(result.response());
    }

    @PutMapping(value = "/refuelings/{externalId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<FuelLogResponses.Refueling> put(@PathVariable String externalId, @RequestBody FuelLogRequests.Upsert request,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        var result = service.put(externalId, request, ifMatch, ifNoneMatch);
        return result.created() ? ResponseEntity.created(URI.create("/api/integrations/v1/fuellog/refuelings/" + externalId))
                .eTag(result.etag()).body(result.response()) : ResponseEntity.ok().eTag(result.etag()).body(result.response());
    }

    @DeleteMapping("/refuelings/{externalId}")
    public ResponseEntity<FuelLogResponses.Refueling> cancel(@PathVariable String externalId, @RequestParam long version,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch) {
        var result = service.cancel(externalId, version, ifMatch);
        return ResponseEntity.ok().eTag(result.etag()).body(result.response());
    }
}
