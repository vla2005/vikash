package com.vikash_api.support;

import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;

public class EmailTestSupport {
    public static MimeMessage newMessage() {
        return new MimeMessage(Session.getInstance(new Properties()));
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
