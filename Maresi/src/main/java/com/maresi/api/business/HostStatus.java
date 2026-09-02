package com.maresi.api.business;

import com.maresi.api.repository.HostApplicationRepository;
import com.maresi.api.repository.UserRepository;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class HostStatus {
  public static final String NONE = "none";
  public static final String PENDING = "pending";
  public static final String REJECTED = "rejected";
  public static final String APPROVED = "approved";

  private final HostApplicationRepository applications;
  private final UserRepository users;

  public HostStatus(HostApplicationRepository applications, UserRepository users) {
    this.applications = applications;
    this.users = users;
  }

  public String resolve(UUID userId, String role) {
    if (userId == null) return NONE;
    if ("admin".equals(role)) return APPROVED;
    String latest =
        applications
            .findLatestByUser(userId)
            .map(row -> str(row.get("status")))
            .filter(status -> status != null && !status.isBlank())
            .orElse(null);
    if (latest != null) return latest;
    if (users.hasHostIntent(userId) || "owner".equals(role)) return PENDING;
    return NONE;
  }

  public boolean canPublish(UUID userId, String role) {
    return APPROVED.equals(resolve(userId, role));
  }

  public void attach(Map<String, Object> user) {
    if (user == null || user.get("id") == null) return;
    UUID id =
        user.get("id") instanceof UUID u ? u : UUID.fromString(user.get("id").toString());
    user.put("host_status", resolve(id, str(user.get("role"))));
  }

  public boolean isHostTrack(Map<String, Object> user) {
    if (user == null) return false;
    String status = str(user.get("host_status"));
    if (status == null) {
      attach(user);
      status = str(user.get("host_status"));
    }
    return status != null && !NONE.equals(status);
  }

  private static String str(Object v) {
    return v == null ? null : v.toString();
  }
}
