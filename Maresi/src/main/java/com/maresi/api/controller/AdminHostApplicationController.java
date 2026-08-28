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
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/host-applications")
@Tag(name = "Admin host applications", description = "Validation des demandes hote")
@SecurityRequirement(name = "bearerAuth")
public class AdminHostApplicationController {
  private final HostApplicationService hostApplicationService;
  private final FunctionalError functionalError;
  private final ExceptionUtils exceptionUtils;

  public AdminHostApplicationController(
      HostApplicationService hostApplicationService,
      FunctionalError functionalError,
      ExceptionUtils exceptionUtils) {
    this.hostApplicationService = hostApplicationService;
    this.functionalError = functionalError;
    this.exceptionUtils = exceptionUtils;
  }

  @GetMapping
  public ResponseEntity<Response<Map<String, Object>>> list(
      @RequestParam(required = false) String status, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> hostApplicationService.listForAdmin(status, loc), loc, exceptionUtils);
  }

  @PatchMapping("/{id}")
  public ResponseEntity<Response<Map<String, Object>>> review(
      @PathVariable UUID id, @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return hostApplicationService.review(id, request, loc);
        },
        loc,
        exceptionUtils);
  }
}
