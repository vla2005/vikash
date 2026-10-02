package com.vikash_api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class EnvironmentConfigurationTest {

    @TempDir
    Path directory;

    @Test
    void shouldImportEnvAndResolveApplicationProperties() throws Exception {
        Path envFile = directory.resolve(".env");
        Files.copy(Path.of(".env.example"), envFile);
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().remove("systemEnvironment");
        environment.getPropertySources().remove("systemProperties");
        environment.getPropertySources().addFirst(new MapPropertySource("test-config", Map.of(
                "spring.config.location", Path.of("src/main/resources/application.properties").toUri().toString(),
                "spring.config.import", envFile.toUri() + "[.properties]")));

        ConfigDataEnvironmentPostProcessor.applyTo(environment);

        assertThat(environment.getProperty("spring.application.name")).isEqualTo("vikash-api");
        assertThat(environment.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://localhost:5432/vikash_db");
        assertThat(environment.getProperty("spring.datasource.password"))
                .isEqualTo("preencha_a_senha_do_banco");
        assertThat(environment.getProperty("spring.datasource.username")).isEqualTo("postgres");
        assertThat(environment.getProperty("security.jwt.access-token-secret"))
                .isEqualTo("preencha_com_uma_chave_aleatoria");
        assertThat(environment.getProperty("gemini.api.key"))
                .isEqualTo("preencha_sua_chave_gemini");
        assertThat(environment.getProperty("security.jwt.refresh-token-expiration-ms", Long.class))
                .isEqualTo(604800000L);
        assertThat(environment.getProperty("server.port", Integer.class)).isEqualTo(8080);
        assertThat(environment.getProperty("APP_NAME")).isNull();
        assertThat(environment.getProperty("GEMINI_API_URL")).isNull();
    }
}
