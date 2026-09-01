package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.Response;
import com.maresi.api.service.FileStorageService.StoredMedia;
import com.maresi.api.contracts.Request;
import com.maresi.api.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "Profil et pieces d'identite")
public class UserController {
  private final UserService userService;
  private final ExceptionUtils exceptionUtils;

  public UserController(UserService userService, ExceptionUtils exceptionUtils) {
    this.userService = userService;
    this.exceptionUtils = exceptionUtils;
  }

  @GetMapping("/me")
  @Operation(summary = "Profil et documents du compte connecte", security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<Response<Map<String, Object>>> me(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> userService.me(loc), loc, exceptionUtils);
  }

  @PatchMapping("/me/location")
  @Operation(summary = "Enregistrer la position du voyageur", security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<Response<Map<String, Object>>> updateLocation(
      @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> userService.updateLocation(request == null ? null : request.getData(), loc), loc, exceptionUtils);
  }

  @PatchMapping(value = "/me/identity", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @Operation(summary = "Mettre a jour la piece d'identite", security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<Response<Map<String, Object>>> updateIdentity(
      @RequestParam(name = "id_card", required = false) String idCard,
      @RequestPart(name = "selfie", required = false) MultipartFile selfie,
      @RequestPart(name = "id_card_photo", required = false) MultipartFile idCardPhoto,
      @RequestPart(name = "id_card_back", required = false) MultipartFile idCardBack,
      Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
    return ControllerSupport.run(
        () -> userService.updateIdentity(idCard, selfie, idCardPhoto, idCardBack, baseUrl, loc),
        loc,
        exceptionUtils);
  }

  @GetMapping("/{id}/identity/{kind}")
  @Operation(summary = "Photo d'identite (selfie, recto, verso)", security = @SecurityRequirement(name = "bearerAuth"))
  public ResponseEntity<byte[]> identityPhoto(@PathVariable UUID id, @PathVariable String kind) {
    StoredMedia media = userService.loadIdentity(id, kind);
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
