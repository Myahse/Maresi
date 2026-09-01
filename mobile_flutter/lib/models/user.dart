enum UserRole { client, owner, admin }

class User {
  const User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.phone,
    this.accountStatus,
    this.reviewMessage,
  });

  final String id;
  final String email;
  final String fullName;
  final UserRole role;
  final String? phone;
  final String? accountStatus;
  final String? reviewMessage;

  bool get isSuspended => accountStatus == 'suspended';

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
      accountStatus: json['account_status'] as String? ?? json['accountStatus'] as String?,
      reviewMessage: json['review_message'] as String? ?? json['reviewMessage'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'full_name': fullName,
        'role': role.name,
        if (phone != null) 'phone': phone,
        if (accountStatus != null) 'account_status': accountStatus,
        if (reviewMessage != null) 'review_message': reviewMessage,
      };
}

class AuthResponse {
  const AuthResponse({required this.user, required this.token});

  final User user;
  final String token;
}

class NeedsEmailVerificationException implements Exception {
  const NeedsEmailVerificationException(this.email);

  final String email;

  @override
  String toString() => 'NeedsEmailVerificationException($email)';
}
