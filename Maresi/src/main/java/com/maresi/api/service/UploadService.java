package com.maresi.api.service;

import com.maresi.api.business.HostStatus;
import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Response;
import com.maresi.api.exception.ApiException;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.SecurityUtils;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class UploadService {
  private final FileStorageService fileStorage;
  private final FunctionalError functionalError;
  private final HostStatus hostStatus;

  public UploadService(
      FileStorageService fileStorage, FunctionalError functionalError, HostStatus hostStatus) {
    this.fileStorage = fileStorage;
    this.functionalError = functionalError;
    this.hostStatus = hostStatus;
  }

  public Response<Map<String, Object>> storePropertyImages(
      List<MultipartFile> images, String baseUrl, Locale locale) {
    AuthUser user = SecurityUtils.requireUser();
    if (!hostStatus.canManageListings(user.id(), user.role())) {
      throw ApiException.of(403, "Only hosts can upload listing photos");
    }
    if (images == null || images.stream().noneMatch(f -> f != null && !f.isEmpty())) {
      throw ApiException.of(400, "Image required");
    }
    List<String> urls = fileStorage.storePropertyImages(images, baseUrl);
    Response<Map<String, Object>> response = new Response<>();
    response.setItem(Map.of("urls", urls));
    response.setStatus(functionalError.success("Upload", locale));
    return response;
  }
}
