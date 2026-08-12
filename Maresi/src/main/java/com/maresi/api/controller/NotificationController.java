package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.Response;
import com.maresi.api.service.NotificationService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "Notifications", description = "Notifications utilisateur")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {
  private final NotificationService notificationService;
  private final ExceptionUtils exceptionUtils;

  public NotificationController(NotificationService notificationService, ExceptionUtils exceptionUtils) {
    this.notificationService = notificationService;
    this.exceptionUtils = exceptionUtils;
  }

  @GetMapping
  public ResponseEntity<Response<Map<String, Object>>> getMine(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> notificationService.list(loc), loc, exceptionUtils);
  }

  @PatchMapping("/read-all")
  public ResponseEntity<Response<Map<String, Object>>> markAllRead(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> notificationService.markAllRead(loc), loc, exceptionUtils);
  }

  @PatchMapping("/{id}/read")
  public ResponseEntity<Response<Map<String, Object>>> markOneRead(
      @PathVariable UUID id, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> notificationService.markOneRead(id, loc), loc, exceptionUtils);
  }
}
