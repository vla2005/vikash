package com.vikash_api.exceptions;

public class AssistantPlanningException extends RuntimeException {
    public AssistantPlanningException(String message) { super(message); }
    public AssistantPlanningException(String message, Throwable cause) { super(message, cause); }
}
