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
    required UserRole role,
  }) async {
    final result = await _api.register(
      email: email,
      password: password,
      fullName: fullName,
      role: role,
    );
    await _persistSession(result);
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
