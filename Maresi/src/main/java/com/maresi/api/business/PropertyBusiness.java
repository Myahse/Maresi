package com.maresi.api.business;

import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Response;
import com.maresi.api.exception.ApiException;
import com.maresi.api.repository.OwnerSubscriptionRepository;
import com.maresi.api.repository.PropertyRepository;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.SecurityUtils;
import com.maresi.api.service.FileStorageService;
import com.maresi.api.service.NearbyListingNotifier;
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
  private final UserBusiness userBusiness;
  private final HostStatus hostStatus;
  private final NearbyListingNotifier nearbyListingNotifier;

  public PropertyBusiness(
      PropertyRepository properties,
      FileStorageService fileStorage,
      FunctionalError functionalError,
      OwnerSubscriptionRepository subscriptions,
      UserBusiness userBusiness,
      HostStatus hostStatus,
      NearbyListingNotifier nearbyListingNotifier) {
    this.properties = properties;
    this.fileStorage = fileStorage;
    this.functionalError = functionalError;
    this.subscriptions = subscriptions;
    this.userBusiness = userBusiness;
    this.hostStatus = hostStatus;
    this.nearbyListingNotifier = nearbyListingNotifier;
  }

  public Response<Map<String, Object>> list(
      String location,
      BigDecimal minPrice,
      BigDecimal maxPrice,
      String propertyType,
      UUID ownerId,
      boolean mine,
      Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    UUID ownerFilter = ownerId;
    boolean includeInactive = false;
    if (mine) {
      AuthUser required = SecurityUtils.requireUser();
      ownerFilter = required.id();
      includeInactive = true;
    }
    boolean excludeReserved = ownerFilter == null;
    List<Map<String, Object>> items =
        properties.findAll(
            location, minPrice, maxPrice, propertyType, ownerFilter, excludeReserved, includeInactive);
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
              if (!canViewProperty(property)) {
                response.setHasError(true);
                response.setStatus(functionalError.dataNotFound("Bien introuvable", locale));
                return response;
              }
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
      boolean draft,
      String baseUrl,
      Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    if (userBusiness.rejectIfSuspended(response, user.id(), locale)) {
      return response;
    }
    if (!hostStatus.canManageListings(user.id(), user.role())) {
      response.setHasError(true);
      response.setStatus(
          functionalError.disallowed("Vous devez d'abord demander a devenir hote.", locale));
      return response;
    }
    if (!draft && !hostStatus.canPublish(user.id(), user.role())) {
      response.setHasError(true);
      response.setStatus(
          functionalError.disallowed(
              "Votre compte hôte n'est pas encore validé. Enregistrez un brouillon en attendant la validation.",
              locale));
      return response;
    }
    long existing = properties.countByOwner(user.id());
    if (existing >= FREE_LISTINGS && !subscriptions.isActive(user.id())) {
      throw ApiException.of(
          402, "Abonnement proprietaire requis a partir de " + (FREE_LISTINGS + 1) + " annonces");
    }
    List<String> ownedUrls = fileStorage.acceptOwnedImageUrls(uploadedImageUrls, baseUrl);
    List<String> storedUrls = fileStorage.storePropertyImages(images, baseUrl);
    List<String> imageUrls = new ArrayList<>(ownedUrls);
    imageUrls.addAll(storedUrls);
    String safeTitle = title == null || title.isBlank() ? "Untitled listing" : title.trim();
    String safeLocation = location == null ? "" : location.trim();
    String safeType = propertyType == null || propertyType.isBlank() ? "apartment" : propertyType.trim();
    BigDecimal safePrice = price == null ? BigDecimal.ZERO : price;
    if (!draft) {
      requirePublishable(safeTitle, safeLocation, safePrice, imageUrls.size());
    }
    Map<String, Object> extra = extras == null ? new HashMap<>() : new HashMap<>(extras);
    extra.put("is_active", !draft);
    Map<String, Object> created =
        properties.create(
            user.id(),
            safeTitle,
            description != null ? description : "",
            safePrice,
            safeLocation,
            safeType,
            imageUrls,
            extra);
    fileStorage.rewriteImageFields(created);
    if (!draft) {
      nearbyListingNotifier.notifyNearbyClients(created);
    }
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
    if (userBusiness.rejectIfSuspended(response, user.id(), locale)) {
      return response;
    }
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
    data = new HashMap<>(data);
    if (uploadedImageUrls != null || !storedUrls.isEmpty()) {
      List<String> next = new ArrayList<>(ownedUrls);
      next.addAll(storedUrls);
      data.put("images", next);
    }
    if (Boolean.TRUE.equals(data.get("is_active")) && !hostStatus.canPublish(user.id(), user.role())) {
      response.setHasError(true);
      response.setStatus(
          functionalError.disallowed(
              "Votre compte hôte n'est pas encore validé. Enregistrez un brouillon en attendant la validation.",
              locale));
      return response;
    }
    if (Boolean.TRUE.equals(data.get("is_active"))) {
      List<String> photos =
          data.get("images") instanceof List<?> l
              ? l.stream().map(Object::toString).toList()
              : existing.get("images") instanceof List<?> l
                  ? l.stream().map(Object::toString).toList()
                  : List.of();
      String nextTitle =
          data.get("title") != null ? data.get("title").toString() : String.valueOf(existing.get("title"));
      String nextLocation =
          data.get("location") != null
              ? data.get("location").toString()
              : String.valueOf(existing.get("location"));
      BigDecimal nextPrice = asDecimal(data.get("price"), asDecimal(existing.get("price"), BigDecimal.ZERO));
      requirePublishable(nextTitle, nextLocation, nextPrice, photos.size());
    }
    Map<String, Object> updated = properties.update(id, data);
    fileStorage.rewriteImageFields(updated);
    if (!wasActive(existing) && wasActive(updated)) {
      nearbyListingNotifier.notifyNearbyClients(updated);
    }
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
    fileStorage.deletePropertyImages(existing.get("images"));
    properties.remove(id);
    fileStorage.deleteUnreferencedPropertyImages(properties.allImageUrls());
    response.setStatus(functionalError.success("Suppression", locale));
    return response;
  }

  private static boolean wasActive(Map<String, Object> property) {
    if (property == null || property.get("is_active") == null) return false;
    Object raw = property.get("is_active");
    return Boolean.TRUE.equals(raw) || "true".equalsIgnoreCase(String.valueOf(raw));
  }

  private static boolean canViewProperty(Map<String, Object> property) {
    if (!Boolean.FALSE.equals(property.get("is_active"))) return true;
    AuthUser user = SecurityUtils.currentUserOrNull();
    if (user == null) return false;
    if ("admin".equals(user.role())) return true;
    return user.id().toString().equals(String.valueOf(property.get("owner_id")));
  }

  private static void requirePublishable(String title, String location, BigDecimal price, int photoCount) {
    if (title == null || title.isBlank() || "Untitled listing".equals(title)) {
      throw ApiException.of(400, "Title is required to publish");
    }
    if (location == null || location.isBlank()) {
      throw ApiException.of(400, "Location is required to publish");
    }
    if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
      throw ApiException.of(400, "Price is required to publish");
    }
    if (photoCount < MIN_PROPERTY_PHOTOS) {
      throw ApiException.of(400, "At least " + MIN_PROPERTY_PHOTOS + " photos are required");
    }
  }

  private static BigDecimal asDecimal(Object raw, BigDecimal fallback) {
    if (raw instanceof BigDecimal value) return value;
    if (raw instanceof Number number) return BigDecimal.valueOf(number.doubleValue());
    if (raw != null) {
      try {
        return new BigDecimal(raw.toString().trim());
      } catch (NumberFormatException ignored) {
        return fallback;
      }
    }
    return fallback;
  }
}
