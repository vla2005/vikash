package com.vikash_api.exceptions;

public class AiAnalysisUnavailableException extends IllegalStateException {
    public AiAnalysisUnavailableException(String message) { super(message); }
    public AiAnalysisUnavailableException(String message, Throwable cause) { super(message, cause); }
}
