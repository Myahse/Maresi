package com.maresi.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Vérification OTP")
public class OtpVerifyDataDto {
  @Schema(example = "+2250700000000")
  private String phone;

  @Schema(example = "1234")
  private String code;

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getCode() {
    return code;
  }

  public void setCode(String code) {
    this.code = code;
  }
}
