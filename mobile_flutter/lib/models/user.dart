enum UserRole { client, owner, admin }

class User {
  const User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.phone,
  });

  final String id;
  final String email;
  final String fullName;
  final UserRole role;
  final String? phone;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'].toString(),
      email: json['email'] as String,
      fullName: json['full_name'] as String? ?? json['fullName'] as String? ?? '',
      role: UserRole.values.firstWhere(
        (r) => r.name == json['role'],
        orElse: () => UserRole.client,
      ),
      phone: json['phone'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'full_name': fullName,
        'role': role.name,
        if (phone != null) 'phone': phone,
      };
}

class AuthResponse {
  const AuthResponse({required this.user, required this.token});

  final User user;
  final String token;
}
