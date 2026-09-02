package com.maresi.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.maresi.api.config.AppProperties;
import com.maresi.api.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.io.ByteArrayResource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
  public record Attachment(String filename, byte[] content) {}

  private static final Logger log = LoggerFactory.getLogger(EmailService.class);
  private static final URI BREVO_SEND = URI.create("https://api.brevo.com/v3/smtp/email");

  private final JavaMailSender mailSender;
  private final AppProperties.Mail mail;
  private final UserRepository users;
  private final ObjectMapper objectMapper;
  private final String smtpUser;
  private final HttpClient http =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

  public EmailService(
      ObjectProvider<JavaMailSender> mailSender,
      AppProperties props,
      UserRepository users,
      ObjectMapper objectMapper,
      Environment env) {
    this.mailSender = mailSender.getIfAvailable();
    this.mail = props.getMail();
    this.users = users;
    this.objectMapper = objectMapper;
    this.smtpUser = env.getProperty("spring.mail.username", "");
  }

  @PostConstruct
  void logReady() {
    if (apiReady()) {
      log.info("Mail ready via Brevo HTTPS API from={}", fromEmail());
    } else if (smtpReady()) {
      log.info(
          "SMTP ready host={} user={} from={} (Render blocks port 587; set BREVO_API_KEY for production)",
          System.getProperty("MAIL_HOST", "smtp-relay.brevo.com"),
          smtpUser,
          fromEmail());
    } else {
      log.warn(
          "Mail not ready; emails will be skipped. Set BREVO_API_KEY and MAIL_FROM (Render) or MAIL_USERNAME / MAIL_PASSWORD (local SMTP).");
    }
  }

  @Async
  public void sendToUser(UUID userId, String subject, String body) {
    deliverToUser(userId, EmailTemplates.simple(subject.replaceFirst("^Maresi — ", ""), body), null);
  }

  @Async
  public void sendToUser(UUID userId, EmailTemplates.Mail message) {
    deliverToUser(userId, message, null);
  }

  @Async
  public void sendToUser(UUID userId, String subject, String body, Attachment attachment) {
    deliverToUser(userId, EmailTemplates.simple(subject.replaceFirst("^Maresi — ", ""), body), attachment);
  }

  @Async
  public void sendToUser(UUID userId, EmailTemplates.Mail message, Attachment attachment) {
    deliverToUser(userId, message, attachment);
  }

  /** Sends on the caller thread so signup/resend can wait until Brevo accepts the message. */
  public void sendToUserNow(UUID userId, EmailTemplates.Mail message) {
    deliverToUser(userId, message, null);
  }

  private void deliverToUser(UUID userId, EmailTemplates.Mail message, Attachment attachment) {
    if (userId == null || message == null) return;
    String to =
        users
            .findById(userId)
            .map(u -> u.get("email"))
            .map(Object::toString)
            .filter(email -> email != null && email.contains("@"))
            .orElse(null);
    if (to == null) {
      log.warn("Email skipped; user {} has no address", userId);
      return;
    }
    send(to, message, attachment);
  }

  public void send(String to, String subject, String body) {
    send(to, EmailTemplates.simple(subject.replaceFirst("^Maresi — ", ""), body), null);
  }

  public void send(String to, EmailTemplates.Mail message, Attachment attachment) {
    if (to == null || to.isBlank() || message == null) return;
    if (apiReady()) {
      sendViaApi(to.trim(), message, attachment);
      return;
    }
    if (smtpReady()) {
      sendViaSmtp(to.trim(), message, attachment);
      return;
    }
    log.warn("[mail skipped] neither Brevo API nor SMTP is configured; to={} subject={}", to, message.subject());
  }

  private void sendViaApi(String to, EmailTemplates.Mail message, Attachment attachment) {
    try {
      Map<String, Object> payload = new LinkedHashMap<>();
      payload.put("sender", Map.of("name", fromName(), "email", fromEmail()));
      payload.put("to", List.of(Map.of("email", to)));
      payload.put("subject", message.subject());
      payload.put("textContent", message.text());
      payload.put("htmlContent", message.html());
      if (attachment != null && attachment.content() != null && attachment.content().length > 0) {
        payload.put(
            "attachment",
            List.of(
                Map.of(
                    "name",
                    attachment.filename() != null ? attachment.filename() : "contrat-sejour-maresi.pdf",
                    "content",
                    Base64.getEncoder().encodeToString(attachment.content()))));
      }
      String json = objectMapper.writeValueAsString(payload);
      HttpRequest request =
          HttpRequest.newBuilder(BREVO_SEND)
              .timeout(Duration.ofSeconds(20))
              .header("accept", "application/json")
              .header("content-type", "application/json")
              .header("api-key", mail.getBrevoApiKey().trim())
              .POST(HttpRequest.BodyPublishers.ofString(json))
              .build();
      HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        log.info("Email sent via Brevo API to {} subject={}", to, message.subject());
      } else {
        log.warn(
            "Email not sent to {} subject={}: Brevo API HTTP {} {}",
            to,
            message.subject(),
            response.statusCode(),
            brief(response.body()));
      }
    } catch (Exception e) {
      log.warn("Email not sent to {} subject={}: {}", to, message.subject(), e.getMessage());
    }
  }

  private void sendViaSmtp(String to, EmailTemplates.Mail message, Attachment attachment) {
    try {
      MimeMessage mime = mailSender.createMimeMessage();
      boolean multipart = attachment != null && attachment.content() != null;
      MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
      helper.setFrom(fromInternetAddress());
      helper.setTo(to);
      helper.setSubject(message.subject());
      helper.setText(message.text(), message.html());
      if (multipart) {
        String filename =
            attachment.filename() != null ? attachment.filename() : "contrat-sejour-maresi.pdf";
        helper.addAttachment(filename, new ByteArrayResource(attachment.content()), "application/pdf");
      }
      mailSender.send(mime);
      log.info("Email sent via SMTP to {} subject={}", to, message.subject());
    } catch (Exception e) {
      log.warn("Email not sent to {} subject={}: {}", to, message.subject(), e.getMessage());
    }
  }

  private boolean apiReady() {
    return mail.getBrevoApiKey() != null
        && !mail.getBrevoApiKey().isBlank()
        && fromEmail() != null
        && !fromEmail().isBlank();
  }

  private boolean smtpReady() {
    return mailSender != null
        && smtpUser != null
        && !smtpUser.isBlank()
        && fromEmail() != null
        && !fromEmail().isBlank();
  }

  private InternetAddress fromInternetAddress() throws Exception {
    return new InternetAddress(fromEmail(), fromName(), "UTF-8");
  }

  private String fromName() {
    String name = mail.getFromName();
    if (name == null || name.isBlank()) {
      String raw = mail.getFrom() == null ? "" : mail.getFrom().trim();
      if (raw.contains("<")) {
        name = raw.substring(0, raw.indexOf('<')).trim();
      }
    }
    return name == null || name.isBlank() ? "Maresi" : name;
  }

  private String fromEmail() {
    String raw = mail.getFrom() == null ? "" : mail.getFrom().trim();
    if (raw.isEmpty()) return "";
    int open = raw.indexOf('<');
    int close = raw.indexOf('>');
    if (open >= 0 && close > open) {
      return raw.substring(open + 1, close).trim();
    }
    return raw;
  }

  private static String brief(String body) {
    if (body == null) return "";
    String one = body.replaceAll("\\s+", " ").trim();
    return one.length() > 240 ? one.substring(0, 240) : one;
  }
}
