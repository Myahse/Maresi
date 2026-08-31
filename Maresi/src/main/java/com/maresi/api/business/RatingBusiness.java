package com.maresi.api.business;

import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.exception.ApiException;
import com.maresi.api.repository.PropertyRepository;
import com.maresi.api.repository.RatingRepository;
import com.maresi.api.repository.UserRepository;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.SecurityUtils;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class RatingBusiness {
  private final RatingRepository ratings;
  private final PropertyRepository properties;
  private final UserRepository users;
  private final FunctionalError functionalError;

  public RatingBusiness(
      RatingRepository ratings,
      PropertyRepository properties,
      UserRepository users,
      FunctionalError functionalError) {
    this.ratings = ratings;
    this.properties = properties;
    this.users = users;
    this.functionalError = functionalError;
  }

  public Response<Map<String, Object>> list(UUID propertyId, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    if (properties.findById(propertyId).isEmpty()) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Bien introuvable", locale));
      return response;
    }
    List<Map<String, Object>> items = ratings.findByProperty(propertyId);
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("ratings", items);
    payload.put("statistics", ratings.statistics(propertyId));
    response.setItem(payload);
    response.setItems(items);
    response.setCount((long) items.size());
    response.setStatus(functionalError.success("Avis", locale));
    return response;
  }

  public Response<Map<String, Object>> upsert(UUID propertyId, Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> property = properties.findById(propertyId).orElse(null);
    if (property == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Bien introuvable", locale));
      return response;
    }
    Map<String, Object> data = request.getData() == null ? Map.of() : request.getData();
    int score = parseScore(data.get("score"));
    String comment = data.get("comment") == null ? null : data.get("comment").toString().trim();
    if (comment != null && comment.isEmpty()) comment = null;
    Map<String, Object> saved = ratings.upsert(propertyId, user.id(), score, comment);
    String name =
        users
            .findById(user.id())
            .map(u -> u.get("full_name"))
            .map(Object::toString)
            .filter(s -> !s.isBlank())
            .orElse("Client");
    saved.put("user_name", name);
    ratings.refreshPropertyAggregate(propertyId);
    response.setItem(saved);
    response.setStatus(functionalError.success("Avis", locale));
    return response;
  }

  private static int parseScore(Object raw) {
    if (raw == null) throw ApiException.of(400, "Score is required");
    int score;
    try {
      score = raw instanceof Number n ? n.intValue() : Integer.parseInt(raw.toString().trim());
    } catch (NumberFormatException e) {
      throw ApiException.of(400, "Score must be a number");
    }
    if (score < 1 || score > 5) {
      throw ApiException.of(400, "Score must be between 1 and 5");
    }
    return score;
  }
}
