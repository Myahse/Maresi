package com.maresi.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

@Schema(description = "Ajouter un favori")
public class FavoriteDataDto {
  @Schema(example = "00000000-0000-0000-0000-000000000001")
  private UUID propertyId;

  public UUID getPropertyId() {
    return propertyId;
  }

  public void setPropertyId(UUID propertyId) {
    this.propertyId = propertyId;
  }
}
