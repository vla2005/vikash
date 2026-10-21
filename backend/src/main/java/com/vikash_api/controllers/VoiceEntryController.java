package com.vikash_api.controllers;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.vikash_api.dtos.requests.TransactionRequest;
import com.vikash_api.dtos.requests.ReviewedTransactionRequest;
import com.vikash_api.dtos.responses.AiAnalysisResponse;
import com.vikash_api.services.TransactionService;
import com.vikash_api.services.ReviewedTransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
@RestController @RequestMapping("/api/transaction") @RequiredArgsConstructor
public class VoiceEntryController {
    private final TransactionService transactions;
    private final ReviewedTransactionService reviewed;
    @PostMapping("/preview")
    public ResponseEntity<AiAnalysisResponse> preview(@Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.ok(transactions.preview(request));
    }
    @PostMapping("/confirm-reviewed")
    public ResponseEntity<Void> confirm(@Valid @RequestBody ReviewedTransactionRequest request) {
        reviewed.confirm(request);
        return ResponseEntity.ok().build();
    }
}
