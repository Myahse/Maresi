package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.Response;
import com.maresi.api.service.UploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/uploads")
@Tag(name = "Uploads", description = "Photos de biens")
@SecurityRequirement(name = "bearerAuth")
public class UploadController {
  private final UploadService uploadService;
  private final ExceptionUtils exceptionUtils;

  public UploadController(UploadService uploadService, ExceptionUtils exceptionUtils) {
    this.uploadService = uploadService;
    this.exceptionUtils = exceptionUtils;
  }

  @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @Operation(summary = "Envoyer des photos de listing (propriétaire)")
  public ResponseEntity<Response<Map<String, Object>>> uploadImages(
      @RequestPart(name = "images") List<MultipartFile> images, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
    return ControllerSupport.runCreated(
        () -> uploadService.storePropertyImages(images, baseUrl, loc), loc, exceptionUtils);
  }
}
