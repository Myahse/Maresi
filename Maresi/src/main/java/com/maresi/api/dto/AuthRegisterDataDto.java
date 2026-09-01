package com.maresi.api.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Données d'inscription")
public class AuthRegisterDataDto {
  @Schema(example = "client@example.com")
  private String email;

  @Schema(example = "secret12")
  private String password;

  @JsonAlias("full_name")
  @Schema(example = "Jean Dupont")
  private String fullName;

  @JsonAlias("first_name")
  @Schema(example = "Jean")
  private String firstName;

  @JsonAlias("last_name")
  @Schema(example = "Dupont")
  private String lastName;

  @JsonAlias("birth_date")
  @Schema(example = "1998-04-12")
  private String birthDate;

  @Schema(example = "male", allowableValues = {"male", "female", "other"})
  private String gender;

  @Schema(example = "client", allowableValues = {"client", "owner", "host"})
  private String role;

  @Schema(example = "+2250700000000")
  private String phone;

  @JsonAlias({"idCard", "id_card"})
  @Schema(example = "CI123456789")
  private String idCard;

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPassword() {
    return password;
  }

  public void setPassword(String password) {
    this.password = password;
  }

  public String getFullName() {
    return fullName;
  }

  public void setFullName(String fullName) {
    this.fullName = fullName;
  }

  public String getFirstName() {
    return firstName;
  }

  public void setFirstName(String firstName) {
    this.firstName = firstName;
  }

  public String getLastName() {
    return lastName;
  }

  public void setLastName(String lastName) {
    this.lastName = lastName;
  }

  public String getBirthDate() {
    return birthDate;
  }

  public void setBirthDate(String birthDate) {
    this.birthDate = birthDate;
  }

  public String getGender() {
    return gender;
  }

  public void setGender(String gender) {
    this.gender = gender;
  }

  public String getRole() {
    return role;
  }

  public void setRole(String role) {
    this.role = role;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getIdCard() {
    return idCard;
  }

  public void setIdCard(String idCard) {
    this.idCard = idCard;
  }
}
