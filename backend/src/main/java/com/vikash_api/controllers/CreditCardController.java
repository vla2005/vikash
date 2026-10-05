package com.vikash_api.controllers;

import java.util.UUID;

import org.springframework.data.domain.Slice;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.vikash_api.dtos.requests.CreditCardRequest;
import com.vikash_api.dtos.responses.AllCreditCardsResponse;
import com.vikash_api.dtos.responses.CreditCardDetailsResponse;
import com.vikash_api.dtos.responses.TransactionSummaryResponse;
import com.vikash_api.services.CreditCardService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping ("/api/credit-card")
@RequiredArgsConstructor
public class CreditCardController {

    private final CreditCardService creditCardService;

    @PutMapping("/update/{uuid}")
    public ResponseEntity<Void> updateCreditCard(@PathVariable UUID uuid,
            @Valid @RequestBody CreditCardRequest request) {
        creditCardService.update(uuid, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<CreditCardDetailsResponse> getCreditCard(
            @PathVariable UUID uuid) {
        return ResponseEntity.ok(creditCardService.getByUuid(uuid));
    }

    @GetMapping("/{uuid}/invoices/{invoiceUuid}/transactions")
    public ResponseEntity<Slice<TransactionSummaryResponse>> getInvoiceTransactions(
            @PathVariable UUID uuid,
            @PathVariable UUID invoiceUuid,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ResponseEntity.ok(creditCardService.getInvoiceTransactions(uuid, invoiceUuid, page, size));
    }

    @GetMapping
    public ResponseEntity<AllCreditCardsResponse> getCreditCards() {
        return ResponseEntity.status(HttpStatus.OK).body(creditCardService.get());
    }

    @PostMapping
    public ResponseEntity<Void> createCreditCard(@Valid @RequestBody CreditCardRequest request) {
        creditCardService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
