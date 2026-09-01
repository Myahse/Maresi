package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.contracts.Validate;
import com.maresi.api.service.VisitRequestService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.maresi.api.service.FileStorageService.StoredMedia;

@RestController
@RequestMapping("/api/visit-requests")
@Tag(name = "Visit requests", description = "Demandes de visite / réservation")
@SecurityRequirement(name = "bearerAuth")
public class VisitRequestController {
  private final VisitRequestService visitRequestService;
  private final FunctionalError functionalError;
  private final ExceptionUtils exceptionUtils;

  public VisitRequestController(
      VisitRequestService visitRequestService,
      FunctionalError functionalError,
      ExceptionUtils exceptionUtils) {
    this.visitRequestService = visitRequestService;
    this.functionalError = functionalError;
    this.exceptionUtils = exceptionUtils;
  }

  @PostMapping
  public ResponseEntity<Response<Map<String, Object>>> create(
      @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.runCreated(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return visitRequestService.create(request, loc);
        },
        loc,
        exceptionUtils);
  }

  @GetMapping
  public ResponseEntity<Response<Map<String, Object>>> getMine(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> visitRequestService.listMine(loc), loc, exceptionUtils);
  }

  @GetMapping("/owner")
  public ResponseEntity<Response<Map<String, Object>>> getForOwner(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> visitRequestService.listForOwner(loc), loc, exceptionUtils);
  }

  @GetMapping("/{id}")
  public ResponseEntity<Response<Map<String, Object>>> getOne(@PathVariable UUID id, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> visitRequestService.getOne(id, loc), loc, exceptionUtils);
  }

  @PatchMapping("/{id}/status")
  public ResponseEntity<Response<Map<String, Object>>> updateStatus(
      @PathVariable UUID id, @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return visitRequestService.updateStatus(id, request, loc);
        },
        loc,
        exceptionUtils);
  }

  @PostMapping("/{id}/key")
  public ResponseEntity<Response<Map<String, Object>>> confirmKey(
      @PathVariable UUID id, @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return visitRequestService.confirmKey(id, request, loc);
        },
        loc,
        exceptionUtils);
  }

  @PostMapping("/{id}/agreement")
  public ResponseEntity<Response<Map<String, Object>>> signAgreement(
      @PathVariable UUID id, @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return visitRequestService.signAgreement(id, request, loc);
        },
        loc,
        exceptionUtils);
  }

  @PostMapping("/{id}/extension")
  public ResponseEntity<Response<Map<String, Object>>> requestExtension(
      @PathVariable UUID id, @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return visitRequestService.requestExtension(id, request, loc);
        },
        loc,
        exceptionUtils);
  }

  @PostMapping("/{id}/extension/decision")
  public ResponseEntity<Response<Map<String, Object>>> decideExtension(
      @PathVariable UUID id, @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return visitRequestService.decideExtension(id, request, loc);
        },
        loc,
        exceptionUtils);
  }

  @PostMapping("/{id}/extension/paid")
  public ResponseEntity<Response<Map<String, Object>>> markExtensionPaid(
      @PathVariable UUID id, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> visitRequestService.markExtensionPaid(id, loc), loc, exceptionUtils);
  }

  @PostMapping("/{id}/extension/confirm")
  public ResponseEntity<Response<Map<String, Object>>> confirmExtensionPayment(
      @PathVariable UUID id, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> visitRequestService.confirmExtensionPayment(id, loc), loc, exceptionUtils);
  }

  @PostMapping("/{id}/overstay")
  public ResponseEntity<Response<Map<String, Object>>> billOverstay(
      @PathVariable UUID id, @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return visitRequestService.billOverstay(id, request, loc);
        },
        loc,
        exceptionUtils);
  }

  @PostMapping("/{id}/close")
  public ResponseEntity<Response<Map<String, Object>>> closeStay(
      @PathVariable UUID id, @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return visitRequestService.closeStay(id, request, loc);
        },
        loc,
        exceptionUtils);
  }

  @PostMapping(value = "/{id}/receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<Response<Map<String, Object>>> uploadReceipt(
      @PathVariable UUID id, @RequestParam("file") MultipartFile file, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> visitRequestService.uploadPaymentReceipt(id, file, loc), loc, exceptionUtils);
  }

  @GetMapping("/{id}/identity/{kind}")
  public ResponseEntity<byte[]> identityPhoto(@PathVariable UUID id, @PathVariable String kind) {
    StoredMedia media = visitRequestService.loadRequesterIdentity(id, kind);
    if (media == null) return ResponseEntity.notFound().build();
    MediaType type;
    try {
      type = MediaType.parseMediaType(media.contentType());
    } catch (Exception e) {
      type = MediaType.IMAGE_JPEG;
    }
    return ResponseEntity.ok()
        .contentType(type)
        .cacheControl(CacheControl.noStore())
        .body(media.bytes());
  }
}
