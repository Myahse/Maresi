package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.contracts.Validate;
import com.maresi.api.service.PushService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/push")
@Tag(name = "Push", description = "Notifications Web Push")
@SecurityRequirement(name = "bearerAuth")
public class PushController {
  private final PushService pushService;
  private final FunctionalError functionalError;
  private final ExceptionUtils exceptionUtils;

  public PushController(
      PushService pushService, FunctionalError functionalError, ExceptionUtils exceptionUtils) {
    this.pushService = pushService;
    this.functionalError = functionalError;
    this.exceptionUtils = exceptionUtils;
  }

  @GetMapping("/vapid")
  public ResponseEntity<Response<Map<String, Object>>> vapid(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> pushService.vapidPublic(loc), loc, exceptionUtils);
  }

  @PostMapping("/subscribe")
  public ResponseEntity<Response<Map<String, Object>>> subscribe(
      @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return pushService.subscribe(request, loc);
        },
        loc,
        exceptionUtils);
  }

  @PostMapping("/unsubscribe")
  public ResponseEntity<Response<Map<String, Object>>> unsubscribe(
      @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return pushService.unsubscribe(request, loc);
        },
        loc,
        exceptionUtils);
  }
}
