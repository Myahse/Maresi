package com.maresi.api.contracts;

import com.maresi.api.exception.ApiException;
import com.maresi.api.service.FunctionalRollbackException;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.transaction.TransactionSystemException;

@Component
public class ExceptionUtils {
  private static final Logger log = LoggerFactory.getLogger(ExceptionUtils.class);
  private final TechnicalError technicalError;

  public ExceptionUtils(TechnicalError technicalError) {
    this.technicalError = technicalError;
  }

  public void dataAccessException(ResponseBase response, Locale locale, Exception e) {
    e.printStackTrace();
    response.setHasError(true);
    response.setStatus(technicalError.dbQueryRefused(rootCauseSummary(e), locale));
    log.warn("DataAccessException: {}", rootCauseSummary(e));
  }

  public void cannotCreateTransaction(ResponseBase response, Locale locale, Exception e) {
    e.printStackTrace();
    response.setHasError(true);
    response.setStatus(technicalError.dbNotConnect(rootCauseSummary(e), locale));
  }

  public void transactionSystem(ResponseBase response, Locale locale, Exception e) {
    e.printStackTrace();
    response.setHasError(true);
    response.setStatus(technicalError.dbFail(safeMessage(e), locale));
  }

  public void runtimeException(ResponseBase response, Locale locale, Exception e) {
    if (response == null || e == null) return;
    FunctionalRollbackException rollback = findRollback(e);
    if (rollback != null && rollback.getResponse() != null) {
      copyResponse(response, rollback.getResponse());
      return;
    }
    if (e instanceof ApiException api) {
      response.setHasError(true);
      response.setStatus(technicalError.error(api.getMessage(), locale));
      return;
    }
    e.printStackTrace();
    response.setHasError(true);
    response.setStatus(technicalError.error(rootCauseSummary(e), locale));
    log.warn("RuntimeException: {}", rootCauseSummary(e));
  }

  public void exception(ResponseBase response, Locale locale, Exception e) {
    if (response == null || e == null) return;
    FunctionalRollbackException rollback = findRollback(e);
    if (rollback != null && rollback.getResponse() != null) {
      copyResponse(response, rollback.getResponse());
      return;
    }
    if (e instanceof ApiException api) {
      response.setHasError(true);
      response.setStatus(technicalError.error(api.getMessage(), locale));
      return;
    }
    e.printStackTrace();
    response.setHasError(true);
    response.setStatus(technicalError.internError(rootCauseSummary(e), locale));
  }

  private static void copyResponse(ResponseBase target, ResponseBase source) {
    target.setHasError(source.isHasError());
    target.setStatus(source.getStatus());
    target.setCount(source.getCount());
  }

  private static FunctionalRollbackException findRollback(Throwable t) {
    Throwable cur = t;
    int guard = 0;
    while (cur != null && guard++ < 20) {
      if (cur instanceof FunctionalRollbackException fre) return fre;
      Throwable cause = cur.getCause();
      if (cause == cur) break;
      cur = cause;
    }
    return null;
  }

  private static FunctionalRollbackException findRollback(Throwable t) {
    Throwable root = t;
    int guard = 0;
    while (root.getCause() != null && root.getCause() != root && guard++ < 20) {
      root = root.getCause();
    }
    String rootMsg = root.getMessage();
    if (rootMsg != null && !rootMsg.isBlank()) {
      return root.getClass().getSimpleName() + ": " + rootMsg;
    }
    return t.getClass().getSimpleName();
  }
}
