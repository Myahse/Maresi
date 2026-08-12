package com.maresi.api.contracts;

import java.util.Locale;

public final class Validate {
  private Validate() {}

  public static <T> Response<T> validateObject(
      Request<T> request, Response<T> response, FunctionalError functionalError, Locale locale) {
    if (request == null || request.getData() == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("data", locale));
    }
    return response;
  }
}
