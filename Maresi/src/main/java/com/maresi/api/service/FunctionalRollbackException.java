package com.maresi.api.service;

import com.maresi.api.contracts.Response;
import com.maresi.api.contracts.ResponseBase;

public class FunctionalRollbackException extends RuntimeException {
  private final ResponseBase response;

  public FunctionalRollbackException(Response<?> response) {
    super(response != null && response.getStatus() != null ? response.getStatus().getMessage() : "Business error");
    this.response = response;
  }

  public ResponseBase getResponse() {
    return response;
  }
}
