package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.Response;
import com.maresi.api.service.FileStorageService.StoredMedia;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
