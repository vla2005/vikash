package com.vikash_api.logging;
import static org.assertj.core.api.Assertions.*;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.slf4j.LoggerFactory;
import ch.qos.logback.classic.Logger;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;
import jakarta.servlet.ServletException;

class RequestIdFilterTest {
    @AfterEach void clear() { MDC.clear(); }
    @Test void idIsServerGeneratedReturnedAndRestoredAfterEveryRequestWithoutPrivateUrlHeadersOrBody() throws Exception {
        var logger = (Logger)LoggerFactory.getLogger(RequestIdFilter.class);
        var capture = new LogCapture(); capture.start(); logger.addAppender(capture);
        try {
            var request = new MockHttpServletRequest("POST", "/api/auth/reset-password/SECRET_PATH");
            request.setQueryString("token=SECRET_QUERY"); request.setContent("SECRET_BODY".getBytes());
            request.addHeader("Authorization", "Bearer SECRET_AUTH"); request.addHeader(RequestIdFilter.HEADER, "SECRET_HEADER");
            var response = new MockHttpServletResponse(); MDC.put("previous", "prior-context");
            new RequestIdFilter().doFilter(request, response, (r, s) -> {
                assertThat(MDC.get("requestId")).isEqualTo(response.getHeader(RequestIdFilter.HEADER));
                assertThat(MDC.get("previous")).isNull();
                r.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/api/auth/reset-password/{uuid}");
            });
            UUID.fromString(response.getHeader(RequestIdFilter.HEADER));
            assertThat(MDC.get("requestId")).isNull(); assertThat(MDC.get("previous")).isEqualTo("prior-context");
            assertThat(capture.list).allSatisfy(event -> assertThat(event.getMDCPropertyMap().get("requestId")).isEqualTo(response.getHeader(RequestIdFilter.HEADER)));
            assertThat(capture.rendered()).contains("event=request.start", "route=/api/auth/reset-password/{uuid}", "status=200").doesNotContain("SECRET_");
        } finally { logger.detachAppender(capture); capture.stop(); }
    }
    @Test void unexpectedFilterFailureStillHasIdAndCleansTheThread() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/user"); var response = new MockHttpServletResponse();
        assertThatThrownBy(() -> new RequestIdFilter().doFilter(request, response, (r, s) -> { throw new ServletException("PRIVATE_PAYLOAD"); }))
                .isInstanceOf(ServletException.class);
        UUID.fromString(response.getHeader(RequestIdFilter.HEADER)); assertThat(MDC.get("requestId")).isNull();
    }
    @Test void eachRequestGetsADifferentId() throws Exception {
        var first = new MockHttpServletResponse(); var second = new MockHttpServletResponse(); var filter = new RequestIdFilter();
        filter.doFilter(new MockHttpServletRequest("GET", "/api/institutions"), first, (r,s) -> {});
        filter.doFilter(new MockHttpServletRequest("GET", "/api/institutions"), second, (r,s) -> {});
        assertThat(first.getHeader(RequestIdFilter.HEADER)).isNotEqualTo(second.getHeader(RequestIdFilter.HEADER));
    }
}
