package com.maresi.api.service;

import com.maresi.api.config.AppProperties;
import com.maresi.api.exception.ApiException;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.apache.ApacheHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class FileStorageService {
  private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);
  private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/png", "image/gif", "image/webp");
  private static final long MAX_BYTES = 5 * 1024 * 1024;
  private static final int MAX_OWNED_URLS = 40;
  private static final int R2_PUT_THREADS = 4;

  private final Path propertyDir;
  private final Path identityDir;
  private final String uploadDirName;
  private final AppProperties.R2 r2;
  private final S3Client r2Client;
  private final ExecutorService r2Executor;

  public FileStorageService(AppProperties props) {
    this.uploadDirName = props.getUploadDir();
    this.r2 = props.getR2();
    if (r2.isConfigured()) {
      this.r2Client = buildR2Client(r2);
      this.r2Executor = Executors.newFixedThreadPool(R2_PUT_THREADS);
      this.propertyDir = null;
      this.identityDir = null;
      log.info("Image storage: Cloudflare R2 bucket={} public={}", r2.getBucket(), r2.resolvedPublicUrl());
    } else {
      this.r2Client = null;
      this.r2Executor = null;
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
    List<PreparedImage> prepared = new ArrayList<>();
    for (MultipartFile file : files) {
      if (file == null || file.isEmpty()) continue;
      prepared.add(prepareImage(file, "properties"));
    }
    if (prepared.isEmpty()) return List.of();
    if (r2Client != null && prepared.size() > 1) {
      return storePreparedOnR2Parallel(prepared);
    }
    List<String> urls = new ArrayList<>(prepared.size());
    for (PreparedImage image : prepared) {
      urls.add(storePrepared(image, propertyDir, baseUrl));
    }
    return urls;
  }

  public String storeIdentityImage(MultipartFile file, String baseUrl) {
    if (file == null || file.isEmpty()) {
      throw ApiException.of(400, "Image required");
    }
    return storePrepared(prepareImage(file, "identity"), identityDir, baseUrl);
  }

  public List<String> acceptOwnedImageUrls(List<String> urls, String baseUrl) {
    if (urls == null || urls.isEmpty()) return List.of();
    String prefix = ownedPropertyPrefix(baseUrl);
    List<String> accepted = new ArrayList<>();
    for (String raw : urls) {
      if (raw == null) continue;
      String url = raw.trim();
      if (url.isEmpty()) continue;
      if (!url.startsWith(prefix)) {
        throw ApiException.of(400, "Invalid image URL");
      }
      accepted.add(url);
    }
    if (accepted.size() > MAX_OWNED_URLS) {
      throw ApiException.of(400, "Too many images");
    }
    return accepted;
  }

  private PreparedImage prepareImage(MultipartFile file, String folder) {
    String contentType = resolveImageType(file);
    if (contentType == null || !ALLOWED.contains(contentType)) {
      throw ApiException.of(400, "Only images (jpeg, png, gif, webp) allowed");
    }
    if (file.getSize() > MAX_BYTES) {
      throw ApiException.of(400, "File too large");
    }
    String ext = extensionFor(contentType);
    String filename = System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8) + ext;
    try {
      return new PreparedImage(file.getBytes(), contentType, folder + "/" + filename);
    } catch (IOException e) {
      throw ApiException.of(500, "Failed to store file");
    }
  }

  private String storePrepared(PreparedImage image, Path localDir, String baseUrl) {
    if (r2Client != null) {
      return putOnR2(image);
    }
    Path target = localDir.resolve(image.key.substring(image.key.lastIndexOf('/') + 1));
    try {
      Files.write(target, image.bytes);
    } catch (IOException e) {
      throw ApiException.of(500, "Failed to store file");
    }
    return baseUrl + "/" + uploadDirName + "/" + image.key;
  }

  private List<String> storePreparedOnR2Parallel(List<PreparedImage> images) {
    List<Callable<String>> tasks = new ArrayList<>(images.size());
    for (PreparedImage image : images) {
      tasks.add(() -> putOnR2(image));
    }
    try {
      List<Future<String>> futures = r2Executor.invokeAll(tasks, 2, TimeUnit.MINUTES);
      List<String> urls = new ArrayList<>(images.size());
      for (Future<String> future : futures) {
        if (!future.isDone() || future.isCancelled()) {
          throw ApiException.of(500, "Failed to store file");
        }
        urls.add(future.get());
      }
      return urls;
    } catch (ApiException e) {
      throw e;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw ApiException.of(500, "Failed to store file");
    } catch (java.util.concurrent.ExecutionException e) {
      if (e.getCause() instanceof ApiException api) throw api;
      log.error("Parallel R2 upload failed: {}", e.getMessage());
      throw ApiException.of(500, "Failed to store file");
    } catch (Exception e) {
      log.error("Parallel R2 upload failed: {}", e.getMessage());
      throw ApiException.of(500, "Failed to store file");
    }
  }

  private String putOnR2(PreparedImage image) {
    try {
      PutObjectRequest request =
          PutObjectRequest.builder()
              .bucket(r2.getBucket())
              .key(image.key)
              .contentType(image.contentType)
              .contentLength((long) image.bytes.length)
              .cacheControl("public, max-age=31536000, immutable")
              .build();
      r2Client.putObject(request, RequestBody.fromBytes(image.bytes));
      return r2.resolvedPublicUrl() + "/" + image.key;
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      log.error("R2 upload failed for key={}: {}", image.key, e.getMessage());
      throw ApiException.of(500, "Failed to store file");
    }
  }

  private String ownedPropertyPrefix(String baseUrl) {
    if (r2Client != null) {
      return r2.resolvedPublicUrl() + "/properties/";
    }
    return baseUrl + "/" + uploadDirName + "/properties/";
  }

  private static S3Client buildR2Client(AppProperties.R2 r2) {
    return S3Client.builder()
        .httpClientBuilder(
            ApacheHttpClient.builder()
                .maxConnections(32)
                .connectionTimeout(Duration.ofSeconds(10))
                .socketTimeout(Duration.ofSeconds(90)))
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
    if (r2Executor != null) {
      r2Executor.shutdown();
    }
    if (r2Client != null) {
      r2Client.close();
    }
  }

  private record PreparedImage(byte[] bytes, String contentType, String key) {}
}
