package com.vikash_api.controllers;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.vikash_api.dtos.responses.CreditCardPurchaseResponse;
import com.vikash_api.services.CreditCardPurchaseService;
import com.vikash_api.services.TransactionEditService;
import com.vikash_api.dtos.requests.TransactionUpdateRequest;
import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/credit-card-purchase")
@RequiredArgsConstructor
public class CreditCardPurchaseController {
    private final CreditCardPurchaseService creditCardPurchaseService;
    private final TransactionEditService transactionEditService;

    @PutMapping("/{uuid}")
    public ResponseEntity<Void> updatePurchase(@PathVariable UUID uuid,
            @Valid @RequestBody TransactionUpdateRequest request) {
        transactionEditService.updatePurchase(uuid, request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{uuid}")
    public ResponseEntity<Void> deletePurchase(@PathVariable UUID uuid) {
        creditCardPurchaseService.delete(uuid);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<CreditCardPurchaseResponse> getPurchase(@RequestParam UUID uuid) {
        return ResponseEntity.ok(creditCardPurchaseService.getByUuid(uuid));
    }
}
