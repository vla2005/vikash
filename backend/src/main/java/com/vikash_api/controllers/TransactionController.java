package com.vikash_api.controllers;

import org.springframework.data.domain.Slice;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.vikash_api.dtos.requests.TransactionRequest;
import com.vikash_api.dtos.requests.TransactionUpdateRequest;
import com.vikash_api.dtos.responses.TransactionSummaryResponse;
import com.vikash_api.dtos.responses.TransactionResponse;
import java.util.UUID;
import com.vikash_api.services.TransactionService;
import com.vikash_api.services.TransactionEditService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/transaction")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;
    private final TransactionEditService transactionEditService;

    @PutMapping("/{uuid}")
    public ResponseEntity<Void> updateTransaction(@PathVariable UUID uuid,
            @Valid @RequestBody TransactionUpdateRequest request) {
        transactionEditService.updateTransaction(uuid, request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{uuid}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable UUID uuid) {
        transactionService.delete(uuid);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/details")
    public ResponseEntity<TransactionResponse> getTransaction(@RequestParam UUID uuid) {
        return ResponseEntity.ok(transactionService.getByUuid(uuid));
    }

    @PostMapping("/create")
    public ResponseEntity<Void> createTransaction(@Valid @RequestBody TransactionRequest request) {
        transactionService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping
    public ResponseEntity<Slice<TransactionSummaryResponse>> getSummaries(
            @RequestParam(defaultValue = "0") @Min(value = 0, message = "A página não pode ser negativa.") int page,

            @RequestParam(defaultValue = "20") @Min(value = 1, message = "O tamanho da página deve ser pelo menos 1.") @Max(value = 100, message = "O tamanho da página deve ser no máximo 100.") int size) {

        return ResponseEntity.ok(transactionService.getSummaries(page, size));
    }
}
