package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.Response;
import com.maresi.api.service.HealthService;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = "Health", description = "Santé de l'API")
public class HealthController {
  private final HealthService healthService;
  private final ExceptionUtils exceptionUtils;

  public HealthController(HealthService healthService, ExceptionUtils exceptionUtils) {
    this.healthService = healthService;
    this.exceptionUtils = exceptionUtils;
  }

  @GetMapping("/health")
  public ResponseEntity<Response<Map<String, Object>>> health(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> healthService.health(loc), loc, exceptionUtils);
  }
}
