package com.vikash_api.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Set;
import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class BuildEnvironmentIsolationTest {
    private final Path root = Path.of(System.getProperty("basedir"));

    private Set<String> excludedVariables() throws Exception {
        var factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        var document = factory.newDocumentBuilder().parse(root.resolve("pom.xml").toFile());
        var nodes = document.getElementsByTagName("excludedEnvironmentVariable");
        Set<String> names = new HashSet<>();
        for (int index = 0; index < nodes.getLength(); index++) names.add(nodes.item(index).getTextContent().trim());
        return names;
    }

    @Test void excludesEveryDocumentedDeploymentVariableFromTheTestProcess() throws Exception {
        var excluded = excludedVariables();
        var documented = Files.readAllLines(root.resolve(".env.example")).stream()
            .map(String::trim).filter(line -> !line.startsWith("#") && line.contains("="))
            .map(line -> line.substring(0, line.indexOf('='))).toList();
        assertThat(excluded).containsAll(documented).contains("ASSISTANT_READER_DOCKER_URL",
            "SPRING_DATASOURCE_URL", "SPRING_APPLICATION_JSON", "SPRING_PROFILES_ACTIVE");
        for (String name : excluded) {
            // Assert only presence: a failure must never print a real secret.
            assertThat(System.getenv(name) == null).as("Production environment variable excluded: %s", name).isTrue();
        }
    }

    @Test void preservesExplicitDisposableDatabaseAndLiveTestOptIns() throws Exception {
        assertThat(excludedVariables()).doesNotContain("ASSISTANT_TEST_DB_URL", "ASSISTANT_TEST_DB_PASSWORD",
            "ASSISTANT_READER_TEST_PASSWORD", "ASSISTANT_LIVE_GEMINI_API_KEY", "VIKASH_ASSISTANT_EXECUTION_TEST",
            "VIKASH_ASSISTANT_ANSWER_POSTGRES_TEST", "VIKASH_ASSISTANT_LIVE_TEST");
    }
}
