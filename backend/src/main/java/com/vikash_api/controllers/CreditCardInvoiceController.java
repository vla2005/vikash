package com.vikash_api.controllers;

import com.vikash_api.dtos.requests.CreditCardInvoicePaymentRequest;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.vikash_api.dtos.requests.CreditCardInvoiceRequest;
import com.vikash_api.dtos.responses.AllCreditCardInvoicesResponse;
import com.vikash_api.dtos.responses.CreditCardInvoiceResponse;
import com.vikash_api.services.CreditCardInvoiceService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/credit-card-invoice")
@RequiredArgsConstructor
public class CreditCardInvoiceController {
    private final CreditCardInvoiceService creditCardInvoiceService;

    @PostMapping("/{uuid}/pay")
    public ResponseEntity<Void> payInvoice(@PathVariable UUID uuid,
            @Valid @RequestBody CreditCardInvoicePaymentRequest request) {
        creditCardInvoiceService.pay(uuid, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping
    public ResponseEntity<CreditCardInvoiceResponse> createInvoice(@Valid @RequestBody CreditCardInvoiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(creditCardInvoiceService.create(request));
    }

    @GetMapping
    public ResponseEntity<AllCreditCardInvoicesResponse> getInvoices(@RequestParam(required = false) UUID creditCardUuid) {
        return ResponseEntity.status(HttpStatus.OK).body(creditCardInvoiceService.get(creditCardUuid));
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<CreditCardInvoiceResponse> getInvoice(@PathVariable UUID uuid) {
        return ResponseEntity.status(HttpStatus.OK).body(creditCardInvoiceService.getByUuid(uuid));
    }

    @PutMapping("/update/{uuid}")
    public ResponseEntity<CreditCardInvoiceResponse> updateInvoice(@PathVariable UUID uuid, @Valid @RequestBody CreditCardInvoiceRequest request) {
        return ResponseEntity.status(HttpStatus.OK).body(creditCardInvoiceService.update(uuid, request));
    }
}
