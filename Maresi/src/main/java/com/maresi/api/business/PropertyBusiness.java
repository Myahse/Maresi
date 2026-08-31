package com.maresi.api.business;

import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Response;
import com.maresi.api.exception.ApiException;
import com.maresi.api.repository.OwnerSubscriptionRepository;
import com.maresi.api.repository.PropertyRepository;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.SecurityUtils;
import com.maresi.api.service.FileStorageService;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class PropertyBusiness {
  public static final int MIN_PROPERTY_PHOTOS = 12;
  public static final int FREE_LISTINGS = 3;

  private final PropertyRepository properties;
  private final FileStorageService fileStorage;
  private final FunctionalError functionalError;
  private final OwnerSubscriptionRepository subscriptions;

  public PropertyBusiness(
      PropertyRepository properties,
      FileStorageService fileStorage,
      FunctionalError functionalError,
      OwnerSubscriptionRepository subscriptions) {
    this.properties = properties;
    this.fileStorage = fileStorage;
    this.functionalError = functionalError;
    this.subscriptions = subscriptions;
  }

  public Response<Map<String, Object>> list(
      String location,
      BigDecimal minPrice,
      BigDecimal maxPrice,
      String propertyType,
      UUID ownerId,
      Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.currentUserOrNull();
    UUID ownerFilter = ownerId;
    if (ownerFilter == null && user != null && "owner".equals(user.role())) {
      ownerFilter = user.id();
    }
    boolean excludeReserved = ownerFilter == null;
    List<Map<String, Object>> items =
        properties.findAll(location, minPrice, maxPrice, propertyType, ownerFilter, excludeReserved);
    fileStorage.rewriteImageFields(items);
    response.setItems(items);
    response.setCount((long) items.size());
    response.setStatus(functionalError.success("Annonces", locale));
    return response;
  }

  public Response<Map<String, Object>> getById(UUID id, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    return properties
        .findById(id)
        .map(
            property -> {
              fileStorage.rewriteImageFields(property);
              response.setItem(property);
              response.setStatus(functionalError.success("Bien", locale));
              return response;
            })
        .orElseGet(
            () -> {
              response.setHasError(true);
              response.setStatus(functionalError.dataNotFound("Bien introuvable", locale));
              return response;
            });
  }

  public Response<Map<String, Object>> create(
      String title,
      String description,
      BigDecimal price,
      String location,
      String propertyType,
      List<MultipartFile> images,
      List<String> uploadedImageUrls,
      Map<String, Object> extras,
      String baseUrl,
      Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    long existing = properties.countByOwner(user.id());
    if (existing >= FREE_LISTINGS && !subscriptions.isActive(user.id())) {
      throw ApiException.of(
          402, "Abonnement proprietaire requis a partir de " + (FREE_LISTINGS + 1) + " annonces");
    }
    List<String> ownedUrls = fileStorage.acceptOwnedImageUrls(uploadedImageUrls, baseUrl);
    List<String> storedUrls = fileStorage.storePropertyImages(images, baseUrl);
    List<String> imageUrls = new ArrayList<>(ownedUrls);
    imageUrls.addAll(storedUrls);
    if (imageUrls.size() < MIN_PROPERTY_PHOTOS) {
      throw ApiException.of(400, "At least " + MIN_PROPERTY_PHOTOS + " photos are required");
    }
    Map<String, Object> created =
        properties.create(
            user.id(),
            title,
            description != null ? description : "",
            price,
            location,
            propertyType,
            imageUrls,
            extras);
    fileStorage.rewriteImageFields(created);
    response.setItem(created);
    response.setStatus(functionalError.success("Creation", locale));
    return response;
  }

  public Response<Map<String, Object>> update(
      UUID id,
      Map<String, Object> data,
      List<MultipartFile> images,
      List<String> uploadedImageUrls,
      String baseUrl,
      Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> existing = properties.findById(id).orElse(null);
    if (existing == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Bien introuvable", locale));
      return response;
    }
    if (!user.id().toString().equals(String.valueOf(existing.get("owner_id")))) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Modification non autorisee", locale));
      return response;
    }
    List<String> ownedUrls = fileStorage.acceptOwnedImageUrls(uploadedImageUrls, baseUrl);
    List<String> storedUrls = fileStorage.storePropertyImages(images, baseUrl);
    if (!ownedUrls.isEmpty() || !storedUrls.isEmpty()) {
      List<String> current =
          existing.get("images") instanceof List<?> l
              ? l.stream().map(Object::toString).toList()
              : List.of();
      List<String> merged = new ArrayList<>(current);
      merged.addAll(ownedUrls);
      merged.addAll(storedUrls);
      data = new HashMap<>(data);
      data.put("images", merged);
    }
    Map<String, Object> updated = properties.update(id, data);
    fileStorage.rewriteImageFields(updated);
    response.setItem(updated);
    response.setStatus(functionalError.success("Mise a jour", locale));
    return response;
  }

  public Response<Map<String, Object>> remove(UUID id, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> existing = properties.findById(id).orElse(null);
    if (existing == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Bien introuvable", locale));
      return response;
    }
    if (!user.id().toString().equals(String.valueOf(existing.get("owner_id")))) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Suppression non autorisee", locale));
      return response;
    }
    properties.remove(id);
    response.setStatus(functionalError.success("Suppression", locale));
    return response;
  }
}
