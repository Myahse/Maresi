package com.maresi.api.contracts;

public final class StatusCode {
  private StatusCode() {}

  public static final String SUCCESS = "800";

  public static final String TECH_DB_NOT_CONNECT = "1001";
  public static final String TECH_DB_FAIL = "1002";
  public static final String TECH_INTERN_ERROR = "1003";
  public static final String TECH_DB_PERMISSION_DENIED = "1004";
  public static final String TECH_DB_QUERY_REFUSED = "1005";

  public static final String FUNC_FAIL = "900";
  public static final String FUNC_AUTH_FAIL = "901";
  public static final String FUNC_DATA_NOT_EXIST = "902";
  public static final String FUNC_DATA_EMPTY = "903";
  public static final String FUNC_DATA_EXIST = "904";
  public static final String FUNC_FIELD_EMPTY = "905";
  public static final String FUNC_REQUEST_FAIL = "907";
  public static final String FUNC_SAVE_FAIL = "914";
  public static final String FUNC_LOGIN_FAIL = "919";
  public static final String FUNC_DISALLOWED_OPERATION = "920";
  public static final String FUNC_DATA_NOT_FOUND = "925";
  public static final String FUNC_INVALID_DATA = "926";
  public static final String FUNC_CUSTOM = "2000";
}
