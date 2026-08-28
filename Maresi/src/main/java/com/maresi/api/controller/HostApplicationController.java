package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.contracts.Validate;
import com.maresi.api.service.HostApplicationService;
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
@RequestMapping("/api/host-applications")
@Tag(name = "Host applications", description = "Demande pour devenir hote")
@SecurityRequirement(name = "bearerAuth")
public class HostApplicationController {
  private final HostApplicationService hostApplicationService;
  private final FunctionalError functionalError;
  private final ExceptionUtils exceptionUtils;

  public HostApplicationController(
      HostApplicationService hostApplicationService,
      FunctionalError functionalError,
      ExceptionUtils exceptionUtils) {
    this.hostApplicationService = hostApplicationService;
    this.functionalError = functionalError;
    this.exceptionUtils = exceptionUtils;
  }

  @PostMapping
  public ResponseEntity<Response<Map<String, Object>>> submit(
      @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.runCreated(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return hostApplicationService.submit(request, loc);
        },
        loc,
        exceptionUtils);
  }

  @GetMapping("/me")
  public ResponseEntity<Response<Map<String, Object>>> mine(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> hostApplicationService.mine(loc), loc, exceptionUtils);
  }
}
