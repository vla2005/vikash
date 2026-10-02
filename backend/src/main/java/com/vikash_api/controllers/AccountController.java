package com.vikash_api.controllers;

import org.springframework.http.ResponseEntity;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.vikash_api.dtos.requests.AccountRequest;
import com.vikash_api.dtos.responses.AccountResponse;
import com.vikash_api.dtos.responses.AllAccountsResponse;
import com.vikash_api.services.AccountService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @PostMapping("/create")
    public ResponseEntity<AccountResponse> createAccount(@Valid @RequestBody AccountRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(accountService.create(request));
    }

    @GetMapping
    public ResponseEntity<AllAccountsResponse> getAllAccounts() {
        return ResponseEntity.status(HttpStatus.OK).body(accountService.get());
    }

    @PutMapping("/update/{uuid}")
    public ResponseEntity<AccountResponse> updateAccount(@PathVariable UUID uuid, @Valid @RequestBody AccountRequest request) {
        return ResponseEntity.status(HttpStatus.OK).body(accountService.update(uuid, request));
    }
}
