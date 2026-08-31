package com.maresi.api.controller;

import com.maresi.api.service.FileStorageService;
import com.maresi.api.service.FileStorageService.StoredMedia;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/media")
public class MediaController {
  private static final String PREFIX = "/api/media/";
  private final FileStorageService fileStorage;

  public MediaController(FileStorageService fileStorage) {
    this.fileStorage = fileStorage;
  }

  @GetMapping("/**")
  public ResponseEntity<byte[]> get(HttpServletRequest request) {
    String uri = request.getRequestURI();
    int idx = uri.indexOf(PREFIX);
    String key = idx >= 0 ? uri.substring(idx + PREFIX.length()) : "";
    StoredMedia media = fileStorage.loadPublicPropertyImage(key);
    if (media == null) {
      return ResponseEntity.notFound().build();
    }
    MediaType type;
    try {
      type = MediaType.parseMediaType(media.contentType());
    } catch (Exception e) {
      type = MediaType.IMAGE_JPEG;
    }
    return ResponseEntity.ok()
        .contentType(type)
        .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
        .body(media.bytes());
  }
}
