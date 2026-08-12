package com.maresi.api.security;

import java.util.UUID;

public record AuthUser(UUID id, String email, String role) {}
