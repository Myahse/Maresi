package com.maresi.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Demande d'envoi OTP")
public class OtpSendDataDto {
  @Schema(example = "+2250700000000")
  private String phone;

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }
}
