package com.vikash_api.services;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vikash_api.dtos.requests.ReviewedTransactionRequest;
import com.vikash_api.entities.VoiceEntryReceiptEntity;
import com.vikash_api.exceptions.InvalidTransactionException;
import com.vikash_api.repositories.UserRepository;
import com.vikash_api.repositories.VoiceEntryReceiptRepository;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
@Service @RequiredArgsConstructor
public class ReviewedTransactionService {
    private final AuthenticatedUserService auth;
    private final UserRepository users;
    private final VoiceEntryReceiptRepository receipts;
    private final TransactionService transactions;
    private final ObjectMapper json;
    @Transactional
    public void confirm(ReviewedTransactionRequest request) {
        var user = auth.getCurrentUser();
        // Serialize confirmations for this user, including across API instances.
        users.findByUuidForUpdate(user.getUuid())
            .orElseThrow(() -> new InvalidTransactionException("Usuário não encontrado."));
        String hash;
        try {
            hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(json.writeValueAsBytes(List.of(request.transcription(), request.analysis()))));
        } catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
        var existing = receipts.findByUserIdAndRequestId(user.getId(), request.requestId());
        if (existing.isPresent()) {
            if (!existing.get().getPayloadHash().equals(hash)) {
                throw new InvalidTransactionException("Esta confirmação já foi usada com outros dados. Confira o extrato.");
            }
            return;
        }
        transactions.saveReviewed(request);
        var receipt = new VoiceEntryReceiptEntity();
        receipt.setUserId(user.getId()); receipt.setRequestId(request.requestId());
        receipt.setPayloadHash(hash); receipt.setCreatedAt(Instant.now());
        receipts.saveAndFlush(receipt);
    }
}
