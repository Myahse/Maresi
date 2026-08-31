package com.maresi.api.service;

import com.maresi.api.config.AppProperties;
import com.maresi.api.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.util.UUID;
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
  private static final Logger log = LoggerFactory.getLogger(EmailService.class);
  private final JavaMailSender mailSender;
  private final AppProperties.Mail mail;
  private final UserRepository users;
  private final String smtpUser;

  public EmailService(
      ObjectProvider<JavaMailSender> mailSender,
      AppProperties props,
      UserRepository users,
      Environment env) {
    this.mailSender = mailSender.getIfAvailable();
    this.mail = props.getMail();
    this.users = users;
    this.smtpUser = env.getProperty("spring.mail.username", "");
  }

  @PostConstruct
  void logReady() {
    if (smtpReady()) {
      log.info(
          "SMTP ready host={} user={} from={}",
          System.getProperty("MAIL_HOST", "smtp-relay.brevo.com"),
          smtpUser,
          fromEmail());
    } else {
      log.warn(
          "SMTP not ready; emails will be skipped. Set MAIL_USERNAME, MAIL_PASSWORD, and MAIL_FROM then restart the API.");
    }
  }

  @Async
  public void sendToUser(UUID userId, String subject, String body) {
    if (userId == null) return;
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
    send(to, subject, body);
  }

  public void send(String to, String subject, String body) {
    if (to == null || to.isBlank()) return;
    if (!smtpReady()) {
      log.warn("[mail skipped] SMTP not configured; to={} subject={}", to, subject);
      return;
    }
    try {
      MimeMessage message = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
      helper.setFrom(fromInternetAddress());
      helper.setTo(to.trim());
      helper.setSubject(subject);
      helper.setText(body, false);
      mailSender.send(message);
      log.info("Email sent to {} subject={}", to, subject);
    } catch (Exception e) {
      log.warn("Email not sent to {} subject={}: {}", to, subject, e.getMessage());
    }
  }

  private boolean smtpReady() {
    return mailSender != null
        && smtpUser != null
        && !smtpUser.isBlank()
        && fromEmail() != null
        && !fromEmail().isBlank();
  }

  private InternetAddress fromInternetAddress() throws Exception {
    String email = fromEmail();
    String name = mail.getFromName();
    if (name == null || name.isBlank()) {
      String raw = mail.getFrom() == null ? "" : mail.getFrom().trim();
      if (raw.contains("<")) {
        name = raw.substring(0, raw.indexOf('<')).trim();
      }
    }
    if (name == null || name.isBlank()) name = "Maresi";
    return new InternetAddress(email, name, "UTF-8");
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
}
