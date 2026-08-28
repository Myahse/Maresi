package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.Response;
import com.maresi.api.service.PaymentService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/webhooks")
@Tag(name = "Webhooks", description = "Webhooks fournisseurs de paiement")
public class GeniusPayWebhookController {
  private final PaymentService paymentService;
  private final ExceptionUtils exceptionUtils;

  public GeniusPayWebhookController(PaymentService paymentService, ExceptionUtils exceptionUtils) {
    this.paymentService = paymentService;
    this.exceptionUtils = exceptionUtils;
  }

  @GetMapping("/geniuspay")
  public ResponseEntity<Map<String, Object>> ping() {
    return ResponseEntity.ok(
        Map.of(
            "ok", true,
            "message",
            "GeniusPay webhook is live. Payments POST here; opening this URL in a browser is only a check."));
  }

  @PostMapping("/geniuspay")
  public ResponseEntity<Response<Map<String, Object>>> geniusPay(HttpServletRequest request, Locale locale)
      throws IOException {
    Locale loc = ControllerSupport.locale(locale);
    String rawBody = StreamUtils.copyToString(request.getInputStream(), StandardCharsets.UTF_8);
    String signature = request.getHeader("X-Webhook-Signature");
    String timestamp = request.getHeader("X-Webhook-Timestamp");
    String event = request.getHeader("X-Webhook-Event");
    return ControllerSupport.run(
        () -> paymentService.handleWebhook(rawBody, signature, timestamp, event, loc),
        loc,
        exceptionUtils);
  }
}
