package com.vikash_api.support;

import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;

public class EmailTestSupport {
    public static MimeMessage newMessage() {
        // Explicit test sender prevents JavaMail from resolving the host name for Message-ID.
        Properties properties = new Properties();
        properties.setProperty("mail.from", "no-reply@example.com");
        return new MimeMessage(Session.getInstance(properties));
    }

    public static String text(MimeMessage message) throws Exception {
        return (String) alternatives(message).getBodyPart(0).getContent();
    }

    public static String html(MimeMessage message) throws Exception {
        return (String) alternatives(message).getBodyPart(1).getContent();
    }

    private static Multipart alternatives(MimeMessage message) throws Exception {
        Multipart related = (Multipart) message.getContent();
        return (Multipart) related.getBodyPart(0).getContent();
    }
}
