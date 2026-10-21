package com.vikash_api.dtos.requests;
import java.util.UUID;
import com.vikash_api.dtos.responses.AiAnalysisResponse;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record ReviewedTransactionRequest(
    @NotNull UUID requestId,
    @NotBlank @Size(max = 5000) String transcription,
    @NotNull AiAnalysisResponse analysis) {}
