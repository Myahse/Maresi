import 'dart:convert';

import 'package:maresi_mobile/models/user.dart';
import 'package:maresi_mobile/services/maresi_api.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  AuthService(this._api);

  final MaresiApi _api;
  static const _tokenKey = 'maresi_token';
  static const _userKey = 'maresi_user';

  User? _user;
  User? get user => _user;
  bool get isAuthenticated => _user != null;

  Future<void> loadStoredSession() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_userKey);
    if (raw == null) return;
    try {
      _user = User.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      await prefs.remove(_userKey);
      await prefs.remove(_tokenKey);
    }
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    final result = await _api.login(email: email, password: password);
    await _persistSession(result);
  }

  Future<void> register({
    required String email,
    required String password,
    required String fullName,
    required String firstName,
    required String lastName,
    required String birthDate,
    required String gender,
    required UserRole role,
    required String idCard,
    required String phone,
    String? selfiePath,
    String? idCardPhotoPath,
    String? idCardBackPath,
  }) async {
    final result = await _api.register(
      email: email,
      password: password,
      fullName: fullName,
      firstName: firstName,
      lastName: lastName,
      birthDate: birthDate,
      gender: gender,
      role: role,
      idCard: idCard,
      phone: phone,
      selfiePath: selfiePath,
      idCardPhotoPath: idCardPhotoPath,
      idCardBackPath: idCardBackPath,
    );
    await _persistSession(result);
  }

  Future<void> resendVerification(String email) {
    return _api.resendVerification(email);
  }

  Future<void> logout() async {
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
    _api.clearSessionCache();
  }

  Future<void> _persistSession(AuthResponse result) async {
    _user = result.user;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, result.token);
    await prefs.setString(_userKey, jsonEncode(result.user.toJson()));
  }
}
