package com.vikash_api.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.vikash_api.dtos.requests.CreditCardRequest;
import com.vikash_api.dtos.responses.CreditCardResponse;
import com.vikash_api.services.CreditCardService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping ("/api/credit-card")
@RequiredArgsConstructor
public class CreditCardController {

    private final CreditCardService creditCardService;

    @PostMapping
    public ResponseEntity<CreditCardResponse> createCreditCard(@Valid @RequestBody CreditCardRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(creditCardService.create(request));
    }
}
