package com.maresi.api.exception;

public class ApiException extends RuntimeException {
  private final int status;

  public ApiException(int status, String message) {
    super(message);
    this.status = status;
  }

  public int getStatus() {
    return status;
  }

  public static ApiException of(int status, String message) {
    return new ApiException(status, message);
  }
}
