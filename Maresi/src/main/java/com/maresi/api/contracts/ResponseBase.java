package com.maresi.api.contracts;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

@JsonInclude(Include.NON_NULL)
public class ResponseBase {
  protected Status status = new Status();
  protected boolean hasError;
  protected Long count;

  public Status getStatus() {
    return status;
  }

  public void setStatus(Status status) {
    this.status = status;
  }

  public boolean isHasError() {
    return hasError;
  }

  public void setHasError(boolean hasError) {
    this.hasError = hasError;
  }

  public Long getCount() {
    return count;
  }

  public void setCount(Long count) {
    this.count = count;
  }
}
