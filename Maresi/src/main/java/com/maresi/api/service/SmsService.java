package com.maresi.api.service;

import com.maresi.api.config.AppProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

@Service
public class SmsService {
  private final AppProperties props;
  private final Environment env;
  private final HttpClient http = HttpClient.newHttpClient();

  public SmsService(AppProperties props, Environment env) {
    this.props = props;
    this.env = env;
  }

  public void sendOtpSms(String phone, String code) {
    boolean production = "production".equalsIgnoreCase(env.getProperty("spring.profiles.active", ""));
    if (!production || "mock".equalsIgnoreCase(props.getSms().getProvider())) {
      System.out.println("[SMS mock] OTP for " + phone + ": " + code);
      return;
    }
    if ("twilio".equalsIgnoreCase(props.getSms().getProvider())) {
      sendTwilio(phone, code);
      return;
    }
    System.out.println("[SMS mock] OTP for " + phone + ": " + code);
  }

  private void sendTwilio(String phone, String code) {
    var twilio = props.getSms().getTwilio();
    String sid = twilio.getAccountSid();
    String token = twilio.getAuthToken();
    String from = twilio.getPhoneNumber();
    if (sid.isBlank() || token.isBlank() || from.isBlank()) {
      throw new IllegalStateException("Twilio credentials not configured");
    }
    String body = "Your Maresi verification code is " + code + ". It expires in 5 minutes.";
    String form =
        "To="
            + java.net.URLEncoder.encode(phone, StandardCharsets.UTF_8)
            + "&From="
            + java.net.URLEncoder.encode(from, StandardCharsets.UTF_8)
            + "&Body="
            + java.net.URLEncoder.encode(body, StandardCharsets.UTF_8);
    String auth = Base64.getEncoder().encodeToString((sid + ":" + token).getBytes(StandardCharsets.UTF_8));
    HttpRequest request =
        HttpRequest.newBuilder()
            .uri(URI.create("https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Messages.json"))
            .header("Authorization", "Basic " + auth)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(form))
            .build();
    try {
      HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 400) {
        throw new IllegalStateException("Twilio SMS failed: " + response.body());
      }
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Twilio SMS interrupted", e);
    } catch (java.io.IOException e) {
      throw new IllegalStateException("Twilio SMS failed", e);
    }
  }
}
