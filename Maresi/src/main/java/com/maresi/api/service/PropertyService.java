package com.maresi.api.service;

import com.maresi.api.business.PropertyBusiness;
import com.maresi.api.contracts.Response;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class PropertyService {
  private final PropertyBusiness propertyBusiness;

  public PropertyService(PropertyBusiness propertyBusiness) {
    this.propertyBusiness = propertyBusiness;
  }

  public Response<Map<String, Object>> list(
      String location,
      BigDecimal minPrice,
      BigDecimal maxPrice,
      String propertyType,
      UUID ownerId,
      Locale locale) {
    return propertyBusiness.list(location, minPrice, maxPrice, propertyType, ownerId, locale);
  }

  public Response<Map<String, Object>> getById(UUID id, Locale locale) {
    return propertyBusiness.getById(id, locale);
  }

  public Response<Map<String, Object>> create(
      String title,
      String description,
      BigDecimal price,
      String location,
      String propertyType,
      List<MultipartFile> images,
      String baseUrl,
      Locale locale) {
    return propertyBusiness.create(title, description, price, location, propertyType, images, baseUrl, locale);
  }

  public Response<Map<String, Object>> update(
      UUID id, Map<String, Object> data, List<MultipartFile> images, String baseUrl, Locale locale) {
    return propertyBusiness.update(id, data, images, baseUrl, locale);
  }

  public Response<Map<String, Object>> remove(UUID id, Locale locale) {
    return propertyBusiness.remove(id, locale);
  }
}
