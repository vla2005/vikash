package com.vikash_api.assistant;

import com.vikash_api.exceptions.AssistantAnswerException;
import com.vikash_api.logging.SafeDiagnostics;
import java.nio.charset.StandardCharsets;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.*;

@Slf4j @Service
public class AssistantAnswerClient {
    private final ObjectMapper mapper;
    private final AssistantAnswerFormatter formatter;
    private final RestClient client;
    private final String apiUrl,apiKey,instructions;
    @Value("${assistant.answer.enabled:false}") private boolean enabled=false;
    @Value("${assistant.answer.max-input-bytes:100000}") private int maxInputBytes=100000;
    @Value("${assistant.answer.max-output-tokens:2048}") private int maxOutputTokens=2048;
    public AssistantAnswerClient(ObjectMapper mapper,AssistantAnswerFormatter formatter,
            @Value("${gemini.api.url}") String apiUrl,@Value("${gemini.api.key}") String apiKey) throws java.io.IOException {
        this.mapper=mapper;this.formatter=formatter;this.apiUrl=apiUrl;this.apiKey=apiKey;
        instructions=new ClassPathResource("prompts/financial-answer.txt").getContentAsString(StandardCharsets.UTF_8);
        var factory=new SimpleClientHttpRequestFactory();factory.setConnectTimeout(5000);factory.setReadTimeout(25000);
        client=RestClient.builder().requestFactory(factory).build();
    }
    public boolean isEnabled() { return enabled; }
    public AssistantAnswerFormatter.Answer answer(FinancialAnswerInput input) {
        if(!enabled) throw new AssistantAnswerException("UNAVAILABLE");
        if(TransactionSynchronizationManager.isActualTransactionActive()) throw new AssistantAnswerException("INVALID");
        long started=System.nanoTime();
        try {
            var evidence=formatter.prepare(input);
            String json=mapper.writeValueAsString(evidence.payload());
            int bytes=instructions.getBytes(StandardCharsets.UTF_8).length+json.getBytes(StandardCharsets.UTF_8).length;
            if(maxInputBytes<1000 || maxInputBytes>100000 || bytes>maxInputBytes || maxOutputTokens<128 || maxOutputTokens>4096) throw new AssistantAnswerException("CONTEXT_LIMIT");
            var schema=FinancialReplyPresentation.schema();
            var body=Map.of("systemInstruction",Map.of("parts",List.of(Map.of("text",instructions))),
                "contents",List.of(Map.of("role","user","parts",List.of(Map.of("text",json)))),
                "generationConfig",Map.of("candidateCount",1,"temperature",0,"maxOutputTokens",maxOutputTokens,
                    "responseFormat",Map.of("text",Map.of("mimeType","APPLICATION_JSON","schema",schema))));
            log.info("event=assistant.answer.send inputBytes={} historyTurns={} answerVersion={}",bytes,input.history().size(),AssistantAnswerFormatter.VERSION);
            JsonNode response=client.post().uri(apiUrl).header("x-goog-api-key",apiKey).contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(JsonNode.class);
            if(response==null || !"STOP".equals(response.path("candidates").path(0).path("finishReason").asText())) throw new AssistantAnswerException("INVALID");
            var text=new StringBuilder();
            for(var part:response.path("candidates").path(0).path("content").path("parts"))
                if(!part.path("thought").asBoolean(false)) { text.append(part.path("text").asText(""));if(text.length()>12000)throw new AssistantAnswerException("INVALID"); }
            var answer=formatter.parse(text.toString(),evidence);
            log.info("event=assistant.answer.complete answerVersion={} outputChars={} durationMs={}",AssistantAnswerFormatter.VERSION,answer.content().length(),SafeDiagnostics.elapsedMs(started));
            return answer;
        } catch(RuntimeException failure) {
            SafeDiagnostics.failure(log,"assistant.answer.failed","AssistantAnswerClient.answer",failure,SafeDiagnostics.elapsedMs(started),false);
            if(failure instanceof AssistantAnswerException known)throw known;
            throw new AssistantAnswerException("UNAVAILABLE",failure);
        }
    }
}
