package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.contracts.Validate;
import com.maresi.api.service.PropertyService;
import com.maresi.api.service.RatingService;
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
  private final RatingService ratingService;
  private final FunctionalError functionalError;
  private final ExceptionUtils exceptionUtils;

  public PropertyController(
      PropertyService propertyService,
      RatingService ratingService,
      FunctionalError functionalError,
      ExceptionUtils exceptionUtils) {
    this.propertyService = propertyService;
    this.ratingService = ratingService;
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
      @RequestParam(name = "mine", required = false, defaultValue = "false") boolean mine,
      Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> propertyService.list(location, minPrice, maxPrice, propertyType, ownerId, mine, loc),
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
      @RequestParam(required = false) String title,
      @RequestParam(required = false) String description,
      @RequestParam(required = false) BigDecimal price,
      @RequestParam(required = false) String location,
      @RequestParam(name = "property_type", required = false) String propertyType,
      @RequestParam(required = false) BigDecimal latitude,
      @RequestParam(required = false) BigDecimal longitude,
      @RequestParam(required = false) Integer bedrooms,
      @RequestParam(name = "max_guests", required = false) Integer maxGuests,
      @RequestParam(name = "virtual_tour_url", required = false) String virtualTourUrl,
      @RequestParam(name = "wave_payment_url", required = false) String wavePaymentUrl,
      @RequestParam(name = "orange_money_url", required = false) String orangeMoneyUrl,
      @RequestParam(required = false) List<String> amenities,
      @RequestPart(name = "images", required = false) List<MultipartFile> images,
      @RequestParam(name = "image_urls", required = false) List<String> imageUrls,
      @RequestParam(required = false, defaultValue = "false") boolean draft,
      Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
    Map<String, Object> extras = extraFields(
        latitude, longitude, bedrooms, maxGuests, virtualTourUrl, wavePaymentUrl, orangeMoneyUrl, amenities);
    return ControllerSupport.runCreated(
        () ->
            propertyService.create(
                title,
                description,
                price,
                location,
                propertyType,
                images,
                imageUrls,
                extras,
                draft,
                baseUrl,
                loc),
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
          return propertyService.update(id, request.getData(), null, null, baseUrl, loc);
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
      @RequestParam(required = false) BigDecimal latitude,
      @RequestParam(required = false) BigDecimal longitude,
      @RequestParam(required = false) Integer bedrooms,
      @RequestParam(name = "max_guests", required = false) Integer maxGuests,
      @RequestParam(name = "virtual_tour_url", required = false) String virtualTourUrl,
      @RequestParam(name = "wave_payment_url", required = false) String wavePaymentUrl,
      @RequestParam(name = "orange_money_url", required = false) String orangeMoneyUrl,
      @RequestParam(required = false) List<String> amenities,
      @RequestPart(name = "images", required = false) List<MultipartFile> images,
      @RequestParam(name = "image_urls", required = false) List<String> imageUrls,
      @RequestParam(required = false) Boolean draft,
      Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    Map<String, Object> data = new HashMap<>();
    if (title != null) data.put("title", title);
    if (description != null) data.put("description", description);
    if (price != null) data.put("price", price);
    if (location != null) data.put("location", location);
    if (propertyType != null) data.put("property_type", propertyType);
    if (is_active != null) data.put("is_active", is_active);
    if (Boolean.TRUE.equals(draft)) data.put("is_active", false);
    else if (Boolean.FALSE.equals(draft)) data.put("is_active", true);
    data.putAll(
        extraFields(latitude, longitude, bedrooms, maxGuests, virtualTourUrl, wavePaymentUrl, orangeMoneyUrl, amenities));
    String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
    return ControllerSupport.run(
        () -> propertyService.update(id, data, images, imageUrls, baseUrl, loc), loc, exceptionUtils);
  }

  @GetMapping("/{id}/ratings")
  @Operation(summary = "Lister les avis d'une annonce")
  public ResponseEntity<Response<Map<String, Object>>> listRatings(@PathVariable UUID id, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> ratingService.list(id, loc), loc, exceptionUtils);
  }

  @PostMapping("/{id}/ratings")
  @Operation(summary = "Publier ou mettre à jour un avis", security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<Response<Map<String, Object>>> upsertRating(
      @PathVariable UUID id, @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.runCreated(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return ratingService.upsert(id, request, loc);
        },
        loc,
        exceptionUtils);
  }

  @DeleteMapping("/{id}")
  @Operation(summary = "Supprimer une annonce", security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<Response<Map<String, Object>>> remove(@PathVariable UUID id, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> propertyService.remove(id, loc), loc, exceptionUtils);
  }

  private static Map<String, Object> extraFields(
      BigDecimal latitude,
      BigDecimal longitude,
      Integer bedrooms,
      Integer maxGuests,
      String virtualTourUrl,
      String wavePaymentUrl,
      String orangeMoneyUrl,
      List<String> amenities) {
    Map<String, Object> extras = new HashMap<>();
    if (latitude != null) extras.put("latitude", latitude);
    if (longitude != null) extras.put("longitude", longitude);
    if (bedrooms != null) extras.put("bedrooms", bedrooms);
    if (maxGuests != null) extras.put("max_guests", maxGuests);
    if (virtualTourUrl != null && !virtualTourUrl.isBlank()) extras.put("virtual_tour_url", virtualTourUrl);
    if (wavePaymentUrl != null && !wavePaymentUrl.isBlank()) extras.put("wave_payment_url", wavePaymentUrl);
    if (orangeMoneyUrl != null && !orangeMoneyUrl.isBlank()) extras.put("orange_money_url", orangeMoneyUrl);
    if (amenities != null) {
      extras.put(
          "amenities",
          amenities.stream().filter(item -> item != null && !item.isBlank()).map(String::trim).toList());
    }
    return extras;
  }
}
