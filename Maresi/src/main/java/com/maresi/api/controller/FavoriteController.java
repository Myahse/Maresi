package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.contracts.RequestMapper;
import com.maresi.api.contracts.Validate;
import com.maresi.api.dto.FavoriteDataDto;
import com.maresi.api.service.FavoriteService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/favorites")
@Tag(name = "Favorites", description = "Favoris utilisateur")
@SecurityRequirement(name = "bearerAuth")
public class FavoriteController {
  private final FavoriteService favoriteService;
  private final FunctionalError functionalError;
  private final ExceptionUtils exceptionUtils;
  private final RequestMapper requestMapper;

  public FavoriteController(
      FavoriteService favoriteService,
      FunctionalError functionalError,
      ExceptionUtils exceptionUtils,
      RequestMapper requestMapper) {
    this.favoriteService = favoriteService;
    this.functionalError = functionalError;
    this.exceptionUtils = exceptionUtils;
    this.requestMapper = requestMapper;
  }

  @GetMapping
  public ResponseEntity<Response<Map<String, Object>>> getMine(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> favoriteService.list(loc), loc, exceptionUtils);
  }

  @PostMapping
  public ResponseEntity<Response<Map<String, Object>>> add(
      @RequestBody Request<FavoriteDataDto> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    Request<Map<String, Object>> mapRequest = requestMapper.toMapRequest(request);
    return ControllerSupport.runCreated(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(mapRequest, response, functionalError, loc);
          if (response.isHasError()) return response;
          return favoriteService.add(mapRequest, loc);
        },
        loc,
        exceptionUtils);
  }

  @DeleteMapping("/{propertyId}")
  public ResponseEntity<Response<Map<String, Object>>> remove(
      @PathVariable UUID propertyId, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> favoriteService.remove(propertyId, loc), loc, exceptionUtils);
  }
}
