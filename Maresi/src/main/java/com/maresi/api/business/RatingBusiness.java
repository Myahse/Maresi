package com.maresi.api.business;

import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.exception.ApiException;
import com.maresi.api.repository.NotificationRepository;
import com.maresi.api.repository.PropertyRepository;
import com.maresi.api.repository.RatingRepository;
import com.maresi.api.repository.UserRepository;
import com.maresi.api.service.EmailService;
import com.maresi.api.service.EmailTemplates;
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
  private final NotificationRepository notifications;
  private final EmailService email;
  private final FunctionalError functionalError;

  public RatingBusiness(
      RatingRepository ratings,
      PropertyRepository properties,
      UserRepository users,
      NotificationRepository notifications,
      EmailService email,
      FunctionalError functionalError) {
    this.ratings = ratings;
    this.properties = properties;
    this.users = users;
    this.notifications = notifications;
    this.email = email;
    this.functionalError = functionalError;
  }

  public Response<Map<String, Object>> list(UUID propertyId, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    if (properties.findById(propertyId).isEmpty()) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Bien introuvable", locale));
      return response;
    }
    List<Map<String, Object>> items = ratings.findReviewsByProperty(propertyId);
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("ratings", items);
    payload.put("statistics", ratings.statistics(propertyId));
    AuthUser viewer = SecurityUtils.currentUserOrNull();
    payload.put("my_score", viewer == null ? null : ratings.findScore(propertyId, viewer.id()));
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
    Integer existingScore = ratings.findScore(propertyId, user.id());
    String comment = data.get("comment") == null ? null : data.get("comment").toString().trim();
    if (comment != null && comment.isEmpty()) comment = null;

    int score;
    boolean firstMark = existingScore == null;
    if (firstMark) {
      score = parseScore(data.get("score"));
      ratings.insertMark(propertyId, user.id(), score);
    } else {
      score = existingScore;
      if (comment == null) {
        throw ApiException.of(400, "Comment is required to add another review");
      }
    }

    Map<String, Object> saved;
    if (comment != null) {
      saved = ratings.insertReview(propertyId, user.id(), comment);
    } else {
      saved = new LinkedHashMap<>();
      saved.put("id", null);
      saved.put("property_id", propertyId);
      saved.put("user_id", user.id());
      saved.put("comment", null);
      saved.put("created_at", null);
    }
    String name =
        users
            .findById(user.id())
            .map(u -> u.get("full_name"))
            .map(Object::toString)
            .filter(s -> !s.isBlank())
            .orElse("Client");
    saved.put("user_name", name);
    saved.put("score", score);
    ratings.refreshPropertyAggregate(propertyId);
    UUID ownerId =
        property.get("owner_id") != null ? UUID.fromString(property.get("owner_id").toString()) : null;
    if (ownerId != null && !ownerId.equals(user.id())) {
      String listing = String.valueOf(property.get("title") == null ? "votre residence" : property.get("title"));
      String body =
          firstMark
              ? name + " a laisse une note (" + score + "/5) sur " + listing + "."
              : name + " a laisse un nouvel avis sur " + listing + ".";
      if (comment != null) body += "\n\"" + comment + "\"";
      notifications.create(ownerId, "review", firstMark ? "Nouvelle note" : "Nouvel avis", body, propertyId);
      email.sendToUser(ownerId, EmailTemplates.newReview(name, score, listing, comment));
    }
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
