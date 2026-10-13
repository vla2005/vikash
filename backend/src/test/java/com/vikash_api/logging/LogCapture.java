package com.vikash_api.logging;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
class LogCapture extends ListAppender<ILoggingEvent> {
    LogCapture() { list = new java.util.concurrent.CopyOnWriteArrayList<>(); }
    @Override protected void append(ILoggingEvent event) { event.prepareForDeferredProcessing(); super.append(event); }
    String rendered() {
        var result = new StringBuilder();
        var converter = new SafeThrowableConverter();
        for (var event : list) result.append(event.getFormattedMessage()).append(converter.convert(event));
        return result.toString();
    }
}
