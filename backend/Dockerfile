# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /build

# Dependências reaproveitadas mesmo quando o código muda.
COPY pom.xml ./
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp dependency:go-offline
COPY src ./src
COPY .env.example ./
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp verify \
    && cp target/vikash-api-0.0.1-SNAPSHOT.jar application.jar \
    && java -Djarmode=tools -jar application.jar \
       extract --layers --destination extracted

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app
RUN addgroup -S -g 10001 vikash && adduser -S -D -H -u 10001 -G vikash vikash

COPY --from=build --chown=10001:10001 /build/extracted/dependencies/ ./
COPY --from=build --chown=10001:10001 /build/extracted/spring-boot-loader/ ./
COPY --from=build --chown=10001:10001 /build/extracted/snapshot-dependencies/ ./
COPY --from=build --chown=10001:10001 /build/extracted/application/ ./

ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+ExitOnOutOfMemoryError -Djava.awt.headless=true"
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "application.jar"]
