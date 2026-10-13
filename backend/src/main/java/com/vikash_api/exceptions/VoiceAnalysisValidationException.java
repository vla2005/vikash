package com.vikash_api.exceptions;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.vikash_api.enums.VoiceAnalysisField;

public class VoiceAnalysisValidationException extends InvalidTransactionException {
    private final List<VoiceAnalysisField> fields;
    public VoiceAnalysisValidationException(Collection<VoiceAnalysisField> fields) {
        super(fields.stream().distinct().map(VoiceAnalysisField::guidance).collect(Collectors.joining(" ")));
        this.fields = fields.stream().distinct().toList();
    }
    public String getCode() {
        return fields.contains(VoiceAnalysisField.MULTIPLE_TRANSACTIONS) || fields.contains(VoiceAnalysisField.PARTIAL_INVOICE_PAYMENT)
                ? "VOICE_INPUT_INVALID" : "VOICE_INFORMATION_REQUIRED";
    }
    public List<String> getMissingFields() { return fields.stream().map(VoiceAnalysisField::field).toList(); }
    public Map<String, String> getFieldErrors() {
        var errors = new LinkedHashMap<String, String>();
        fields.forEach(field -> errors.put(field.field(), field.guidance()));
        return errors;
    }
}
