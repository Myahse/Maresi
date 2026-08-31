package com.maresi.api.service;

import com.maresi.api.config.AppProperties;
import com.maresi.api.repository.UserRepository;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
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

  public void sendToUser(UUID userId, String subject, String body) {
    if (userId == null) return;
    users
        .findById(userId)
        .map(u -> u.get("email"))
        .map(Object::toString)
        .filter(email -> email != null && email.contains("@"))
        .ifPresent(email -> send(email, subject, body));
  }

  public void send(String to, String subject, String body) {
    if (to == null || to.isBlank()) return;
    if (!smtpReady()) {
      log.info("[mail skipped] SMTP not configured; to={} subject={}", to, subject);
      return;
    }
    try {
      SimpleMailMessage message = new SimpleMailMessage();
      message.setFrom(fromAddress());
      message.setTo(to);
      message.setSubject(subject);
      message.setText(body);
      mailSender.send(message);
    } catch (Exception e) {
      log.warn("Email not sent to {}: {}", to, e.getMessage());
    }
  }

  private boolean smtpReady() {
    return mailSender != null
        && smtpUser != null
        && !smtpUser.isBlank()
        && mail.getFrom() != null
        && !mail.getFrom().isBlank();
  }

  private String fromAddress() {
    String from = mail.getFrom().trim();
    if (mail.getFromName() != null && !mail.getFromName().isBlank() && !from.contains("<")) {
      return mail.getFromName() + " <" + from + ">";
    }
    return from;
  }
}
