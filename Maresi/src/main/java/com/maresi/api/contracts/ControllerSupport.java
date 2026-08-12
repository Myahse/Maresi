package com.maresi.api.contracts;

import java.util.Locale;
import java.util.function.Supplier;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.transaction.TransactionSystemException;

public final class ControllerSupport {
  private ControllerSupport() {}

  public static Locale locale(Locale locale) {
    if (locale == null) return Locale.FRENCH;
    if ("en".equalsIgnoreCase(locale.getLanguage())) return Locale.ENGLISH;
    return Locale.FRENCH;
  }

  public static <T> ResponseEntity<Response<T>> run(
      Supplier<Response<T>> work, Locale locale, ExceptionUtils exceptionUtils) {
    Response<T> response = new Response<>();
    Locale loc = locale(locale);
    try {
      response = work.get();
    } catch (CannotCreateTransactionException e) {
      exceptionUtils.cannotCreateTransaction(response, loc, e);
    } catch (TransactionSystemException e) {
      exceptionUtils.transactionSystem(response, loc, e);
    } catch (DataAccessException e) {
      exceptionUtils.dataAccessException(response, loc, e);
    } catch (RuntimeException e) {
      exceptionUtils.runtimeException(response, loc, e);
    } catch (Exception e) {
      exceptionUtils.exception(response, loc, e);
    }
    return ResponseEntity.status(httpStatus(response)).body(response);
  }

  public static <T> ResponseEntity<Response<T>> runCreated(Supplier<Response<T>> work, Locale locale, ExceptionUtils exceptionUtils) {
    ResponseEntity<Response<T>> entity = run(work, locale, exceptionUtils);
    if (!entity.getBody().isHasError()) {
      return ResponseEntity.status(HttpStatus.CREATED).body(entity.getBody());
    }
    return entity;
  }

  private static HttpStatus httpStatus(Response<?> response) {
    if (!response.isHasError()) return HttpStatus.OK;
    String code = response.getStatus() != null ? response.getStatus().getCode() : null;
    if (StatusCode.FUNC_AUTH_FAIL.equals(code) || StatusCode.FUNC_LOGIN_FAIL.equals(code)) {
      return HttpStatus.UNAUTHORIZED;
    }
    if (StatusCode.FUNC_DISALLOWED_OPERATION.equals(code)) {
      return HttpStatus.FORBIDDEN;
    }
    if (StatusCode.FUNC_DATA_NOT_EXIST.equals(code) || StatusCode.FUNC_DATA_NOT_FOUND.equals(code)) {
      return HttpStatus.NOT_FOUND;
    }
    if (StatusCode.FUNC_DATA_EXIST.equals(code)) {
      return HttpStatus.CONFLICT;
    }
    if (StatusCode.TECH_INTERN_ERROR.equals(code) || StatusCode.TECH_DB_FAIL.equals(code)) {
      return HttpStatus.INTERNAL_SERVER_ERROR;
    }
    return HttpStatus.BAD_REQUEST;
  }
}
