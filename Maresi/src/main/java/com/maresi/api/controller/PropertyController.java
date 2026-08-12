package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.contracts.Validate;
import com.maresi.api.service.PropertyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/properties")
@Tag(name = "Properties", description = "Annonces de résidences")
public class PropertyController {
  private final PropertyService propertyService;
  private final FunctionalError functionalError;
  private final ExceptionUtils exceptionUtils;

  public PropertyController(
      PropertyService propertyService, FunctionalError functionalError, ExceptionUtils exceptionUtils) {
    this.propertyService = propertyService;
    this.functionalError = functionalError;
    this.exceptionUtils = exceptionUtils;
  }

  @GetMapping
  @Operation(summary = "Lister les annonces (filtres optionnels)")
  public ResponseEntity<Response<Map<String, Object>>> list(
      @RequestParam(required = false) String location,
      @RequestParam(required = false) BigDecimal minPrice,
      @RequestParam(required = false) BigDecimal maxPrice,
      @RequestParam(name = "property_type", required = false) String propertyType,
      @RequestParam(name = "owner_id", required = false) UUID ownerId,
      Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> propertyService.list(location, minPrice, maxPrice, propertyType, ownerId, loc),
        loc,
        exceptionUtils);
  }

  @GetMapping("/{id}")
  @Operation(summary = "Détail d'une annonce")
  public ResponseEntity<Response<Map<String, Object>>> getById(@PathVariable UUID id, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> propertyService.getById(id, loc), loc, exceptionUtils);
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @Operation(summary = "Créer une annonce (propriétaire)", security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<Response<Map<String, Object>>> create(
      @RequestParam String title,
      @RequestParam(required = false) String description,
      @RequestParam BigDecimal price,
      @RequestParam String location,
      @RequestParam(name = "property_type") String propertyType,
      @RequestPart(name = "images", required = false) List<MultipartFile> images,
      Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
    return ControllerSupport.runCreated(
        () -> propertyService.create(title, description, price, location, propertyType, images, baseUrl, loc),
        loc,
        exceptionUtils);
  }

  @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
  @Operation(summary = "Modifier une annonce (JSON)", security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<Response<Map<String, Object>>> updateJson(
      @PathVariable UUID id, @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return propertyService.update(id, request.getData(), null, baseUrl, loc);
        },
        loc,
        exceptionUtils);
  }

  @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @Operation(summary = "Modifier une annonce (multipart)", security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<Response<Map<String, Object>>> updateMultipart(
      @PathVariable UUID id,
      @RequestParam(required = false) String title,
      @RequestParam(required = false) String description,
      @RequestParam(required = false) BigDecimal price,
      @RequestParam(required = false) String location,
      @RequestParam(name = "property_type", required = false) String propertyType,
      @RequestParam(required = false) Boolean is_active,
      @RequestPart(name = "images", required = false) List<MultipartFile> images,
      Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    Map<String, Object> data = new HashMap<>();
    if (title != null) data.put("title", title);
    if (description != null) data.put("description", description);
    if (price != null) data.put("price", price);
    if (location != null) data.put("location", location);
    if (propertyType != null) data.put("property_type", propertyType);
    if (is_active != null) data.put("is_active", is_active);
    String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
    return ControllerSupport.run(
        () -> propertyService.update(id, data, images, baseUrl, loc), loc, exceptionUtils);
  }

  @DeleteMapping("/{id}")
  @Operation(summary = "Supprimer une annonce", security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<Response<Map<String, Object>>> remove(@PathVariable UUID id, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> propertyService.remove(id, loc), loc, exceptionUtils);
  }
}
