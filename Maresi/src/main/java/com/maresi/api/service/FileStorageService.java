package com.maresi.api.service;

import com.maresi.api.config.AppProperties;
import com.maresi.api.exception.ApiException;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class FileStorageService {
  private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);
  private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/png", "image/gif", "image/webp");
  private static final long MAX_BYTES = 5 * 1024 * 1024;

  private final Path propertyDir;
  private final Path identityDir;
  private final String uploadDirName;
  private final AppProperties.R2 r2;
  private final S3Client r2Client;

  public FileStorageService(AppProperties props) {
    this.uploadDirName = props.getUploadDir();
    this.r2 = props.getR2();
    if (r2.isConfigured()) {
      this.r2Client = buildR2Client(r2);
      this.propertyDir = null;
      this.identityDir = null;
      log.info("Image storage: Cloudflare R2 bucket={} public={}", r2.getBucket(), r2.resolvedPublicUrl());
    } else {
      this.r2Client = null;
      Path base = Paths.get(uploadDirName).toAbsolutePath().normalize();
      this.propertyDir = base.resolve("properties");
      this.identityDir = base.resolve("identity");
      try {
        Files.createDirectories(propertyDir);
        Files.createDirectories(identityDir);
      } catch (IOException e) {
        throw new IllegalStateException("Cannot create upload directory", e);
      }
      log.warn("Image storage: local disk (set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL)");
    }
  }

  public List<String> storePropertyImages(List<MultipartFile> files, String baseUrl) {
    if (files == null || files.isEmpty()) return List.of();
    List<String> urls = new ArrayList<>();
    for (MultipartFile file : files) {
      if (file.isEmpty()) continue;
      urls.add(storeImage(file, "properties", propertyDir, baseUrl));
    }
    return urls;
  }

  public String storeIdentityImage(MultipartFile file, String baseUrl) {
    if (file == null || file.isEmpty()) {
      throw ApiException.of(400, "Image required");
    }
    return storeImage(file, "identity", identityDir, baseUrl);
  }

  private String storeImage(MultipartFile file, String folder, Path localDir, String baseUrl) {
    String contentType = resolveImageType(file);
    if (contentType == null || !ALLOWED.contains(contentType)) {
      throw ApiException.of(400, "Only images (jpeg, png, gif, webp) allowed");
    }
    if (file.getSize() > MAX_BYTES) {
      throw ApiException.of(400, "File too large");
    }
    String ext = extensionFor(contentType);
    String filename = System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8) + ext;
    if (r2Client != null) {
      return storeOnR2(file, folder + "/" + filename, contentType);
    }
    Path target = localDir.resolve(filename);
    try {
      file.transferTo(target);
    } catch (IOException e) {
      throw ApiException.of(500, "Failed to store file");
    }
    return baseUrl + "/" + uploadDirName + "/" + folder + "/" + filename;
  }

  private String storeOnR2(MultipartFile file, String key, String contentType) {
    try {
      byte[] bytes = file.getBytes();
      PutObjectRequest request =
          PutObjectRequest.builder()
              .bucket(r2.getBucket())
              .key(key)
              .contentType(contentType)
              .contentLength((long) bytes.length)
              .cacheControl("public, max-age=31536000, immutable")
              .build();
      r2Client.putObject(request, RequestBody.fromBytes(bytes));
      return r2.resolvedPublicUrl() + "/" + key;
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      log.error("R2 upload failed for key={}: {}", key, e.getMessage());
      throw ApiException.of(500, "Failed to store file");
    }
  }

  private static S3Client buildR2Client(AppProperties.R2 r2) {
    return S3Client.builder()
        .httpClient(UrlConnectionHttpClient.create())
        .endpointOverride(URI.create(r2.resolvedEndpoint()))
        .region(Region.of("auto"))
        .credentialsProvider(
            StaticCredentialsProvider.create(
                AwsBasicCredentials.create(r2.getAccessKeyId(), r2.getSecretAccessKey())))
        .serviceConfiguration(
            S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .chunkedEncodingEnabled(false)
                .build())
        .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
        .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
        .build();
  }

  private static String resolveImageType(MultipartFile file) {
    String contentType = file.getContentType();
    if (contentType != null) {
      String lower = contentType.toLowerCase(Locale.ROOT);
      if (ALLOWED.contains(lower)) return lower;
    }
    String name = file.getOriginalFilename();
    if (name == null) return contentType;
    String lowerName = name.toLowerCase(Locale.ROOT);
    if (lowerName.endsWith(".png")) return "image/png";
    if (lowerName.endsWith(".gif")) return "image/gif";
    if (lowerName.endsWith(".webp")) return "image/webp";
    if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
    return contentType;
  }

  private static String extensionFor(String contentType) {
    return switch (contentType.toLowerCase(Locale.ROOT)) {
      case "image/png" -> ".png";
      case "image/gif" -> ".gif";
      case "image/webp" -> ".webp";
      default -> ".jpg";
    };
  }

  @PreDestroy
  void close() {
    if (r2Client != null) {
      r2Client.close();
    }
  }
}
