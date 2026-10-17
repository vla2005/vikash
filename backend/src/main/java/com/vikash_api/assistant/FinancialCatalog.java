package com.vikash_api.assistant;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class FinancialCatalog {
    private final String json;
    private final String instructions;
    private final String version;
    private final Set<String> viewNames;
    private final Map<String, Set<String>> columns;

    public FinancialCatalog(ObjectMapper mapper) throws IOException {
        json = new ClassPathResource("assistant/financial-catalog.json").getContentAsString(StandardCharsets.UTF_8);
        instructions = new ClassPathResource("prompts/financial-assistant.txt").getContentAsString(StandardCharsets.UTF_8);
        JsonNode catalog = mapper.readTree(json);
        version = catalog.path("version").asText();
        var names = new LinkedHashSet<String>();
        catalog.path("views").forEach(view -> names.add(view.path("name").asText()));
        if (version.isBlank() || names.size() != 7 || names.stream().anyMatch(n -> !n.matches("assistant_finance\\.[a-z_]+")))
            throw new IllegalStateException("Catálogo financeiro inválido.");
        viewNames = Set.copyOf(names);
        var definitions = new LinkedHashMap<String, Set<String>>();
        catalog.path("views").forEach(view -> definitions.put(view.path("name").asText(), Set.copyOf(view.path("columns").propertyNames())));
        columns = Map.copyOf(definitions);
    }
    public String version() { return version; }
    public String json() { return json; }
    public String instructions() { return instructions; }
    public Map<String, Set<String>> columns() { return columns; }
    public Set<String> viewNames() { return viewNames; }
}
