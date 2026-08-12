package com.maresi.api.service;

import com.maresi.api.config.AppProperties;
import com.maresi.api.exception.ApiException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {
  private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/png", "image/gif", "image/webp");
  private static final long MAX_BYTES = 5 * 1024 * 1024;

  private final Path propertyDir;
  private final String uploadDirName;

  public FileStorageService(AppProperties props) {
    this.uploadDirName = props.getUploadDir();
    Path base = Paths.get(uploadDirName).toAbsolutePath().normalize();
    this.propertyDir = base.resolve("properties");
    try {
      Files.createDirectories(propertyDir);
    } catch (IOException e) {
      throw new IllegalStateException("Cannot create upload directory", e);
    }
  }

  public List<String> storePropertyImages(List<MultipartFile> files, String baseUrl) {
    if (files == null || files.isEmpty()) return List.of();
    List<String> urls = new ArrayList<>();
    for (MultipartFile file : files) {
      if (file.isEmpty()) continue;
      String contentType = file.getContentType();
      if (contentType == null || !ALLOWED.contains(contentType.toLowerCase(Locale.ROOT))) {
        throw ApiException.of(400, "Only images (jpeg, png, gif, webp) allowed");
      }
      if (file.getSize() > MAX_BYTES) {
        throw ApiException.of(400, "File too large");
      }
      String ext = extensionFor(contentType);
      String filename = System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8) + ext;
      Path target = propertyDir.resolve(filename);
      try {
        file.transferTo(target);
      } catch (IOException e) {
        throw ApiException.of(500, "Failed to store file");
      }
      urls.add(baseUrl + "/" + uploadDirName + "/properties/" + filename);
    }
    return urls;
  }

  private static String extensionFor(String contentType) {
    return switch (contentType.toLowerCase(Locale.ROOT)) {
      case "image/png" -> ".png";
      case "image/gif" -> ".gif";
      case "image/webp" -> ".webp";
      default -> ".jpg";
    };
  }
}
