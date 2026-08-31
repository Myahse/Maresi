import 'package:flutter/material.dart';
import 'package:maresi_mobile/models/user.dart';
import 'package:maresi_mobile/services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  AuthProvider(this._authService);

  final AuthService _authService;
  bool _loading = true;

  bool get isLoading => _loading;
  User? get user => _authService.user;
  bool get isAuthenticated => _authService.isAuthenticated;
  bool get isOwner => user?.role == UserRole.owner;
  bool get isClient => user?.role == UserRole.client;

  Future<void> bootstrap() async {
    await _authService.loadStoredSession();
    _loading = false;
    notifyListeners();
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    await _authService.login(email: email, password: password);
    notifyListeners();
  }

  Future<void> register({
    required String email,
    required String password,
    required String fullName,
    required UserRole role,
    required String idCard,
    String? selfiePath,
    String? idCardPhotoPath,
  }) async {
    await _authService.register(
      email: email,
      password: password,
      fullName: fullName,
      role: role,
      idCard: idCard,
      selfiePath: selfiePath,
      idCardPhotoPath: idCardPhotoPath,
    );
    notifyListeners();
  }

  Future<void> logout() async {
    await _authService.logout();
    notifyListeners();
  }
}
