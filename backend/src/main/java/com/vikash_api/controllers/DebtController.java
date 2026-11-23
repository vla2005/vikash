package com.vikash_api.controllers;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.vikash_api.dtos.requests.DebtRequest;
import com.vikash_api.dtos.requests.DebtPaymentRequest;
import com.vikash_api.dtos.responses.AllDebtsResponse;
import com.vikash_api.dtos.responses.DebtResponse;
import com.vikash_api.services.DebtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/debt")
@RequiredArgsConstructor
public class DebtController {

    private final DebtService debts;

    @GetMapping
    public ResponseEntity<AllDebtsResponse> get() {
        return ResponseEntity.ok(debts.get());
    }

    @PostMapping("/create")
    public ResponseEntity<DebtResponse> create(@Valid @RequestBody DebtRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(debts.create(request));
    }

    @PutMapping("/update/{uuid}")
    public ResponseEntity<DebtResponse> update(@PathVariable UUID uuid, @Valid @RequestBody DebtRequest request) {
        return ResponseEntity.ok(debts.update(uuid, request));
    }

    @PutMapping("/{uuid}/installments/{number}/payment")
    public ResponseEntity<DebtResponse> payInstallment(@PathVariable UUID uuid, @PathVariable @Min(1) int number,
            @Valid @RequestBody DebtPaymentRequest request) {
        return ResponseEntity.ok(debts.payInstallment(uuid, number, request));
    }
}
