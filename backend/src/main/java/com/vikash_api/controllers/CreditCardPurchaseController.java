package com.vikash_api.controllers;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.vikash_api.dtos.responses.CreditCardPurchaseResponse;
import com.vikash_api.services.CreditCardPurchaseService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/credit-card-purchase")
@RequiredArgsConstructor
public class CreditCardPurchaseController {
    private final CreditCardPurchaseService creditCardPurchaseService;

    @GetMapping
    public ResponseEntity<CreditCardPurchaseResponse> getPurchase(@RequestParam UUID uuid) {
        return ResponseEntity.ok(creditCardPurchaseService.getByUuid(uuid));
    }
}
