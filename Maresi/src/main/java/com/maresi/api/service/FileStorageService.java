package com.maresi.api.service;

import com.maresi.api.config.AppProperties;
import com.maresi.api.exception.ApiException;
import jakarta.annotation.PreDestroy;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.apache.ApacheHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.S3Object;

@Service
public class FileStorageService {
  private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);
  private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/png", "image/gif", "image/webp");
  private static final long MAX_BYTES = 5 * 1024 * 1024;
  private static final int MAX_OWNED_URLS = 40;
  private static final int R2_PUT_THREADS = 4;
  private static final Pattern PROPERTY_KEY =
      Pattern.compile("(?:^|/)(properties/[A-Za-z0-9._-]+)", Pattern.CASE_INSENSITIVE);
  private static final Pattern IDENTITY_KEY =
      Pattern.compile("(?:^|/)(identity/[A-Za-z0-9._-]+)", Pattern.CASE_INSENSITIVE);

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
      if (isDirectPublicUrl()) {
        log.info("Image storage: Cloudflare R2 bucket={} public={}", r2.getBucket(), r2.resolvedPublicUrl());
      } else {
        log.warn(
            "Image storage: Cloudflare R2 bucket={} — R2_PUBLIC_URL is not a public r2.dev/custom domain; listing photos are served at /api/media/**",
            r2.getBucket());
      }
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
      return storePreparedOnR2Parallel(prepared, baseUrl);
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
    List<String> accepted = new ArrayList<>();
    for (String raw : urls) {
      if (raw == null) continue;
      String url = raw.trim();
      if (url.isEmpty()) continue;
      String key = extractPropertyObjectKey(url);
      if (key == null) {
        throw ApiException.of(400, "Invalid image URL");
      }
      accepted.add(browserUrlForKey(key, baseUrl));
    }
    if (accepted.size() > MAX_OWNED_URLS) {
      throw ApiException.of(400, "Too many images");
    }
    return accepted;
  }

  public void rewriteImageFields(List<Map<String, Object>> items) {
    if (items == null) return;
    String baseUrl = currentRequestBaseUrl();
    for (Map<String, Object> item : items) {
      rewriteImageFields(item, baseUrl);
    }
  }

  public void rewriteImageFields(Map<String, Object> item) {
    rewriteImageFields(item, currentRequestBaseUrl());
  }

  private void rewriteImageFields(Map<String, Object> item, String baseUrl) {
    if (item == null) return;
    Object raw = item.get("images");
    if (!(raw instanceof List<?> list)) return;
    List<String> next = new ArrayList<>(list.size());
    for (Object value : list) {
      if (value == null) continue;
      String url = value.toString().trim();
      if (url.isEmpty()) continue;
      next.add(toBrowserUrl(url, baseUrl));
    }
    item.put("images", next);
  }

  public void deletePropertyImages(Object rawImages) {
    LinkedHashSet<String> keys = new LinkedHashSet<>();
    for (String url : urlsFrom(rawImages)) {
      String key = extractPropertyObjectKey(url);
      if (key != null) keys.add(key);
    }
    if (keys.isEmpty()) {
      log.warn("Listing delete: no property photo keys found on stored image URLs");
      return;
    }
    log.info("Listing delete: removing {} photo(s) from storage", keys.size());
    deleteKeys(keys);
  }

  public void deleteUnreferencedPropertyImages(List<String> stillUsedUrls) {
    if (r2Client == null) return;
    LinkedHashSet<String> keep = new LinkedHashSet<>();
    for (String url : urlsFrom(stillUsedUrls)) {
      String key = extractPropertyObjectKey(url);
      if (key != null) keep.add(key);
    }
    Instant cutoff = Instant.now().minus(Duration.ofMinutes(10));
    int scanned = 0;
    int removed = 0;
    log.info("Sweeping leftover listing photos in R2 (keeping {} still in use)", keep.size());
    try {
      String token = null;
      do {
        ListObjectsV2Response page =
            r2Client.listObjectsV2(
                ListObjectsV2Request.builder()
                    .bucket(r2.getBucket())
                    .prefix("properties/")
                    .continuationToken(token)
                    .overrideConfiguration(c -> c.apiCallTimeout(Duration.ofSeconds(25)))
                    .build());
        for (S3Object object : page.contents()) {
          scanned++;
          String key = object.key();
          if (key == null || !key.startsWith("properties/") || keep.contains(key)) continue;
          Instant modified = object.lastModified();
          if (modified != null && modified.isAfter(cutoff)) continue;
          if (deleteR2Key(key)) removed++;
        }
        token = Boolean.TRUE.equals(page.isTruncated()) ? page.nextContinuationToken() : null;
      } while (token != null);
    } catch (Exception e) {
      log.warn("Could not sweep leftover listing photos in R2: {}", e.getMessage());
    }
    log.info("R2 listing photo sweep finished: scanned={}, removed={}", scanned, removed);
  }

  private void deleteKeys(Set<String> keys) {
    if (r2Client != null) {
      int removed = 0;
      for (String key : keys) {
        if (deleteR2Key(key)) removed++;
      }
      log.info("Deleted {}/{} listing photo(s) from R2", removed, keys.size());
      return;
    }
    if (propertyDir == null) return;
    for (String key : keys) {
      Path target = propertyDir.resolve(key.substring(key.lastIndexOf('/') + 1)).normalize();
      if (!target.startsWith(propertyDir)) continue;
      try {
        Files.deleteIfExists(target);
      } catch (IOException e) {
        log.warn("Could not delete local listing photo {}: {}", key, e.getMessage());
      }
    }
  }

  private boolean deleteR2Key(String key) {
    try {
      r2Client.deleteObject(DeleteObjectRequest.builder().bucket(r2.getBucket()).key(key).build());
      return true;
    } catch (NoSuchKeyException e) {
      return false;
    } catch (Exception e) {
      log.warn("R2 delete failed for key={}: {}", key, e.getMessage());
      return false;
    }
  }

  private static List<String> urlsFrom(Object raw) {
    if (raw == null) return List.of();
    if (raw instanceof java.sql.Array sqlArray) {
      try {
        return urlsFrom(sqlArray.getArray());
      } catch (Exception e) {
        return List.of();
      }
    }
    if (raw instanceof List<?> list) {
      List<String> out = new ArrayList<>(list.size());
      for (Object value : list) {
        if (value != null && !value.toString().isBlank()) out.add(value.toString().trim());
      }
      return out;
    }
    if (raw instanceof String[] strings) return List.of(strings);
    if (raw instanceof Object[] objects) {
      List<String> out = new ArrayList<>(objects.length);
      for (Object value : objects) {
        if (value != null && !value.toString().isBlank()) out.add(value.toString().trim());
      }
      return out;
    }
    if (raw instanceof String text && !text.isBlank()) return List.of(text.trim());
    return List.of();
  }

  public StoredMedia loadPublicPropertyImage(String rawKey) {
    String key = extractPropertyObjectKey(rawKey);
    if (key == null && rawKey != null) {
      key = extractPropertyObjectKey("properties/" + rawKey.replaceFirst("^/+", ""));
    }
    if (key == null) return null;
    if (r2Client != null) {
      try {
        GetObjectRequest request = GetObjectRequest.builder().bucket(r2.getBucket()).key(key).build();
        try (ResponseInputStream<GetObjectResponse> in = r2Client.getObject(request)) {
          String contentType = in.response().contentType();
          if (contentType == null || contentType.isBlank()) {
            contentType = contentTypeForKey(key);
          }
          return new StoredMedia(in.readAllBytes(), contentType);
        }
      } catch (NoSuchKeyException e) {
        return null;
      } catch (S3Exception e) {
        if (e.statusCode() == 404) return null;
        log.error("R2 get failed for key={}: {}", key, e.getMessage());
        throw ApiException.of(500, "Failed to load file");
      } catch (IOException e) {
        log.error("R2 read failed for key={}: {}", key, e.getMessage());
        throw ApiException.of(500, "Failed to load file");
      }
    }
    if (propertyDir == null) return null;
    Path target = propertyDir.resolve(key.substring(key.lastIndexOf('/') + 1)).normalize();
    if (!target.startsWith(propertyDir) || !Files.isRegularFile(target)) return null;
    try {
      return new StoredMedia(Files.readAllBytes(target), contentTypeForKey(key));
    } catch (IOException e) {
      log.error("Disk read failed for key={}: {}", key, e.getMessage());
      return null;
    }
  }

  public StoredMedia loadIdentityImage(String stored) {
    String key = extractIdentityObjectKey(stored);
    if (key == null) return null;
    if (r2Client != null) {
      try {
        GetObjectRequest request = GetObjectRequest.builder().bucket(r2.getBucket()).key(key).build();
        try (ResponseInputStream<GetObjectResponse> in = r2Client.getObject(request)) {
          String contentType = in.response().contentType();
          if (contentType == null || contentType.isBlank()) contentType = contentTypeForKey(key);
          return new StoredMedia(in.readAllBytes(), contentType);
        }
      } catch (NoSuchKeyException e) {
        return null;
      } catch (S3Exception e) {
        if (e.statusCode() == 404) return null;
        log.error("R2 identity get failed for key={}: {}", key, e.getMessage());
        return null;
      } catch (IOException e) {
        log.error("R2 identity read failed for key={}: {}", key, e.getMessage());
        return null;
      }
    }
    if (identityDir == null) return null;
    Path target = identityDir.resolve(key.substring(key.lastIndexOf('/') + 1)).normalize();
    if (!target.startsWith(identityDir) || !Files.isRegularFile(target)) return null;
    try {
      return new StoredMedia(Files.readAllBytes(target), contentTypeForKey(key));
    } catch (IOException e) {
      return null;
    }
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
      return putOnR2(image, baseUrl);
    }
    Path target = localDir.resolve(image.key.substring(image.key.lastIndexOf('/') + 1));
    try {
      Files.write(target, image.bytes);
    } catch (IOException e) {
      throw ApiException.of(500, "Failed to store file");
    }
    return baseUrl + "/" + uploadDirName + "/" + image.key;
  }

  private List<String> storePreparedOnR2Parallel(List<PreparedImage> images, String baseUrl) {
    List<Callable<String>> tasks = new ArrayList<>(images.size());
    for (PreparedImage image : images) {
      tasks.add(() -> putOnR2(image, baseUrl));
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

  private String putOnR2(PreparedImage image, String baseUrl) {
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
      return browserUrlForKey(image.key, baseUrl);
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      log.error("R2 upload failed for key={}: {}", image.key, e.getMessage());
      throw ApiException.of(500, "Failed to store file");
    }
  }

  private String toBrowserUrl(String stored, String baseUrl) {
    String key = extractPropertyObjectKey(stored);
    if (key != null) {
      return browserUrlForKey(key, baseUrl);
    }
    if (stored.startsWith("/") && !stored.startsWith("//")) {
      String base = trimSlash(baseUrl);
      return base.isEmpty() ? stored : base + stored;
    }
    return stored;
  }

  private String browserUrlForKey(String key, String baseUrl) {
    if (r2Client != null && isDirectPublicUrl()) {
      return r2.resolvedPublicUrl() + "/" + key;
    }
    String base = trimSlash(baseUrl);
    if (base.isEmpty()) {
      base = currentRequestBaseUrl();
    }
    if (r2Client != null) {
      return (base.isEmpty() ? "" : base) + "/api/media/" + key;
    }
    return (base.isEmpty() ? "" : base) + "/" + uploadDirName + "/" + key;
  }

  private boolean isDirectPublicUrl() {
    String url = r2.resolvedPublicUrl().toLowerCase(Locale.ROOT);
    return !url.isBlank() && !url.contains("r2.cloudflarestorage.com");
  }

  static String extractPropertyObjectKey(String stored) {
    if (stored == null || stored.isBlank()) return null;
    String value = stored.trim();
    try {
      value = URLDecoder.decode(value, StandardCharsets.UTF_8);
    } catch (IllegalArgumentException ignored) {
      // keep original
    }
    value = value.replace('\\', '/');
    int query = value.indexOf('?');
    if (query >= 0) value = value.substring(0, query);
    int hash = value.indexOf('#');
    if (hash >= 0) value = value.substring(0, hash);
    Matcher matcher = PROPERTY_KEY.matcher(value);
    if (!matcher.find()) return null;
    String key = matcher.group(1);
    if (key.contains("..")) return null;
    return key;
  }

  static String extractIdentityObjectKey(String stored) {
    if (stored == null || stored.isBlank()) return null;
    String value = stored.trim().replace('\\', '/');
    int query = value.indexOf('?');
    if (query >= 0) value = value.substring(0, query);
    Matcher matcher = IDENTITY_KEY.matcher(value);
    if (!matcher.find()) return null;
    String key = matcher.group(1);
    if (key.contains("..")) return null;
    return key;
  }

  private static String currentRequestBaseUrl() {
    var attrs = RequestContextHolder.getRequestAttributes();
    if (attrs instanceof ServletRequestAttributes servletAttrs) {
      HttpServletRequest request = servletAttrs.getRequest();
      return ServletUriComponentsBuilder.fromContextPath(request).build().toUriString();
    }
    return "";
  }

  private static String trimSlash(String value) {
    if (value == null) return "";
    return value.trim().replaceAll("/+$", "");
  }

  private static String contentTypeForKey(String key) {
    String lower = key.toLowerCase(Locale.ROOT);
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".gif")) return "image/gif";
    if (lower.endsWith(".webp")) return "image/webp";
    return "image/jpeg";
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
    return switch (contentType.toLowerCase()) {
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

  public record StoredMedia(byte[] bytes, String contentType) {}
}
