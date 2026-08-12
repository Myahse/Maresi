package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.Response;
import com.maresi.api.service.PaymentService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/subscriptions")
@Tag(name = "Subscriptions", description = "Abonnement proprietaire")
@SecurityRequirement(name = "bearerAuth")
public class SubscriptionController {
  private final PaymentService paymentService;
  private final ExceptionUtils exceptionUtils;

  public SubscriptionController(PaymentService paymentService, ExceptionUtils exceptionUtils) {
    this.paymentService = paymentService;
    this.exceptionUtils = exceptionUtils;
  }

  @GetMapping("/me")
  public ResponseEntity<Response<Map<String, Object>>> getMine(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> paymentService.getMySubscription(loc), loc, exceptionUtils);
  }
}
