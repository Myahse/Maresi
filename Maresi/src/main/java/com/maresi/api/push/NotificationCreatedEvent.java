package com.maresi.api.push;

import java.util.UUID;
import org.springframework.context.ApplicationEvent;

public class NotificationCreatedEvent extends ApplicationEvent {
  private final UUID userId;
  private final String type;
  private final String title;
  private final String message;
  private final UUID propertyId;

  public NotificationCreatedEvent(
      Object source, UUID userId, String type, String title, String message, UUID propertyId) {
    super(source);
    this.userId = userId;
    this.type = type;
    this.title = title;
    this.message = message;
    this.propertyId = propertyId;
  }

  public UUID getUserId() {
    return userId;
  }

  public String getType() {
    return type;
  }

  public String getTitle() {
    return title;
  }

  public String getMessage() {
    return message;
  }

  public UUID getPropertyId() {
    return propertyId;
  }
}
