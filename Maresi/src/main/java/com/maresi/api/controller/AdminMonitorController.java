package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.contracts.Validate;
import com.maresi.api.service.AdminMonitorService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin monitor", description = "Suivi utilisateurs, paiements, abonnements")
@SecurityRequirement(name = "bearerAuth")
public class AdminMonitorController {
  private final AdminMonitorService adminMonitorService;
  private final FunctionalError functionalError;
  private final ExceptionUtils exceptionUtils;

  public AdminMonitorController(
      AdminMonitorService adminMonitorService,
      FunctionalError functionalError,
      ExceptionUtils exceptionUtils) {
    this.adminMonitorService = adminMonitorService;
    this.functionalError = functionalError;
    this.exceptionUtils = exceptionUtils;
  }

  @GetMapping("/overview")
  public ResponseEntity<Response<Map<String, Object>>> overview(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> adminMonitorService.overview(loc), loc, exceptionUtils);
  }

  @GetMapping("/users")
  public ResponseEntity<Response<Map<String, Object>>> users(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> adminMonitorService.users(loc), loc, exceptionUtils);
  }

  @GetMapping("/payments")
  public ResponseEntity<Response<Map<String, Object>>> payments(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> adminMonitorService.payments(loc), loc, exceptionUtils);
  }

  @GetMapping("/subscriptions")
  public ResponseEntity<Response<Map<String, Object>>> subscriptions(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> adminMonitorService.subscriptions(loc), loc, exceptionUtils);
  }

  @PatchMapping("/subscriptions/{userId}")
  public ResponseEntity<Response<Map<String, Object>>> updateSubscription(
      @PathVariable UUID userId, @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return adminMonitorService.updateSubscription(userId, request, loc);
        },
        loc,
        exceptionUtils);
  }

  @PatchMapping("/payments/{id}")
  public ResponseEntity<Response<Map<String, Object>>> updatePayment(
      @PathVariable UUID id, @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return adminMonitorService.updatePayment(id, request, loc);
        },
        loc,
        exceptionUtils);
  }
}
