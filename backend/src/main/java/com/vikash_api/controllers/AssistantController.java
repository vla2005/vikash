package com.vikash_api.controllers;

import com.vikash_api.dtos.requests.AssistantMessageRequest;
import com.vikash_api.dtos.responses.AssistantMessageResponse;
import com.vikash_api.services.AssistantService;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assistant")
@RequiredArgsConstructor
public class AssistantController {
    private final AssistantService assistant;

    @PostMapping(value = "/messages", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AssistantMessageResponse> receive(
            @Valid @RequestBody AssistantMessageRequest request,
            @RequestHeader("Idempotency-Key") @Pattern(regexp = "[A-Za-z0-9_-]{1,80}") String idempotencyKey) {
        var accepted = assistant.ask(request, idempotencyKey);
        return ResponseEntity.status(accepted.replayed() ? HttpStatus.OK : HttpStatus.CREATED).body(accepted.response());
    }
}
