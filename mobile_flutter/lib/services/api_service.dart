import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:maresi_mobile/config/app_config.dart';
import 'package:maresi_mobile/models/app_notification.dart';
import 'package:maresi_mobile/models/payment.dart';
import 'package:maresi_mobile/models/property.dart';
import 'package:maresi_mobile/models/property_rating.dart';
import 'package:maresi_mobile/models/user.dart';
import 'package:maresi_mobile/models/visit_request.dart';
import 'package:maresi_mobile/services/maresi_api.dart';
import 'package:maresi_mobile/services/offline_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// HTTP client for the Maresi Spring Boot API.
class ApiService implements MaresiApi {
  ApiService._() {
    OfflineStore.instance.sender = _sendQueued;
  }
  static final ApiService instance = ApiService._();

  static const _getTimeout = Duration(seconds: 12);
  static const _writeTimeout = Duration(seconds: 15);

  final Set<String> _favoritePropertyIds = {};

  bool _isNetworkFailure(Object error) {
    if (error is TimeoutException || error is SocketException || error is HttpException) {
      return true;
    }
    final text = error.toString().toLowerCase();
    return text.contains('socket') ||
        text.contains('timed out') ||
        text.contains('timeout') ||
        text.contains('failed host lookup') ||
        text.contains('connection') ||
        text.contains('network');
  }

  Future<http.Response> _sendOnce(String method, Uri uri, {String? body}) async {
    final headers = await _authHeaders();
    final timeout = method == 'GET' ? _getTimeout : _writeTimeout;
    final Future<http.Response> request = switch (method) {
      'GET' => http.get(uri, headers: headers),
      'POST' => http.post(uri, headers: headers, body: body),
      'PATCH' => http.patch(uri, headers: headers, body: body),
      'PUT' => http.put(uri, headers: headers, body: body),
      'DELETE' => http.delete(uri, headers: headers),
      _ => throw Exception('Unsupported method'),
    };
    return request.timeout(timeout);
  }

  Future<void> _sendQueued(QueuedRequest item) async {
    final uri = Uri.parse('${AppConfig.apiPrefix}${item.path}');
    final res = await _sendOnce(item.method, uri, body: item.body);
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
  }

  Future<dynamic> _jsonRequest(
    String method,
    String path, {
    String? body,
    bool cache = false,
    bool queue = false,
  }) async {
    final uri = Uri.parse('${AppConfig.apiPrefix}$path');
    final isRead = method == 'GET';
    final attempts = isRead ? 3 : 2;
    Object? lastError;

    for (var i = 0; i < attempts; i++) {
      try {
        final res = await _sendOnce(method, uri, body: body);
        final data = _parseBody(res);
        if (res.statusCode >= 400) _throwFromResponse(res, data);
        final unwrapped = _unwrapEnvelope(data);
        if (cache && isRead) await OfflineStore.instance.writeCache(path, unwrapped);
        OfflineStore.instance.markOnline();
        unawaited(OfflineStore.instance.flush());
        return unwrapped;
      } catch (e) {
        lastError = e;
        if (!_isNetworkFailure(e)) break;
        if (isRead && i < attempts - 1) {
          await Future<void>.delayed(Duration(milliseconds: 400 * (1 << i)));
          continue;
        }
        break;
      }
    }

    if (isRead && cache && lastError != null && _isNetworkFailure(lastError)) {
      final cached = await OfflineStore.instance.readCache(path);
      if (cached != null) {
        OfflineStore.instance.markOffline();
        return cached;
      }
    }

    if (queue && (lastError == null || _isNetworkFailure(lastError!))) {
      await OfflineStore.instance.enqueue(method: method, path: path, body: body);
      throw OfflineQueuedException();
    }

    if (lastError != null && _isNetworkFailure(lastError)) {
      OfflineStore.instance.markOffline();
    }
    if (lastError is Exception) throw lastError;
    throw Exception(lastError?.toString() ?? 'Request failed');
  }

  Future<Map<String, String>> _authHeaders() async {
    final headers = {'Content-Type': 'application/json'};
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('maresi_token');
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  dynamic _parseBody(http.Response res) {
    final body = res.body.trim();
    if (body.isEmpty) {
      if (res.statusCode >= 400) {
        throw Exception('Request failed (${res.statusCode})');
      }
      return null;
    }
    try {
      return jsonDecode(body);
    } on FormatException {
      throw Exception('Invalid server response');
    }
  }

  dynamic _unwrapEnvelope(dynamic data) {
    if (data is! Map) return data;
    final map = Map<String, dynamic>.from(data);
    if (map['hasError'] == true) {
      final status = map['status'];
      final message = status is Map ? status['message'] as String? : null;
      throw Exception(message ?? map['error'] as String? ?? 'Request failed');
    }
    if (map['item'] != null) return map['item'];
    if (map['items'] != null) return map['items'];
    return map;
  }

  String _wrapBody(Map<String, dynamic> data) => jsonEncode({'data': data});

  Never _throwFromResponse(http.Response res, dynamic data) {
    if (data is Map && data['hasError'] == true) {
      final status = data['status'];
      final message = status is Map ? status['message'] as String? : null;
      throw Exception(message ?? 'Request failed');
    }
    final message = data is Map
        ? (data['error'] as String? ??
            (data['status'] is Map ? (data['status'] as Map)['message'] as String? : null) ??
            'Request failed')
        : 'Request failed (${res.statusCode})';
    throw Exception(message);
  }

  Future<List<AppNotification>> listNotifications() async {
    final res = await http.get(
      Uri.parse('${AppConfig.apiPrefix}/notifications'),
      headers: await _authHeaders(),
    );
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    final list = _unwrapEnvelope(data) as List<dynamic>? ?? [];
    return list.map((e) => AppNotification.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> markNotificationRead(String id) async {
    final res = await http.patch(
      Uri.parse('${AppConfig.apiPrefix}/notifications/$id/read'),
      headers: await _authHeaders(),
    );
    if (res.statusCode >= 400) {
      _throwFromResponse(res, _parseBody(res));
    }
  }

  Future<void> markAllNotificationsRead() async {
    final res = await http.patch(
      Uri.parse('${AppConfig.apiPrefix}/notifications/read-all'),
      headers: await _authHeaders(),
    );
    if (res.statusCode >= 400) {
      _throwFromResponse(res, _parseBody(res));
    }
  }

  Future<List<Property>> listProperties({
    String? location,
    int? minPrice,
    int? maxPrice,
    String? propertyType,
  }) async {
    final query = <String, String>{};
    if (location != null && location.isNotEmpty) query['location'] = location;
    if (minPrice != null) query['minPrice'] = minPrice.toString();
    if (maxPrice != null) query['maxPrice'] = maxPrice.toString();
    if (propertyType != null && propertyType.isNotEmpty) {
      query['property_type'] = propertyType;
    }

    final qs = query.isEmpty ? '' : '?${Uri(queryParameters: query).query}';
    final list = await _jsonRequest('GET', '/properties$qs', cache: true) as List<dynamic>? ?? [];
    return list.map((e) => Property.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Property> getProperty(String id) async {
    final data = await _jsonRequest('GET', '/properties/$id', cache: true);
    return Property.fromJson(data as Map<String, dynamic>);
  }

  Future<List<Favorite>> listFavorites() async {
    final headers = await _authHeaders();
    if (!headers.containsKey('Authorization')) {
      _favoritePropertyIds.clear();
      return [];
    }

    final res = await http.get(
      Uri.parse('${AppConfig.apiPrefix}/favorites'),
      headers: headers,
    );
    final data = _parseBody(res);
    if (res.statusCode == 401 || res.statusCode == 403) {
      _favoritePropertyIds.clear();
      return [];
    }
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    final list = _unwrapEnvelope(data) as List<dynamic>? ?? [];
    final favorites = list.map((e) => Favorite.fromJson(e as Map<String, dynamic>)).toList();
    _favoritePropertyIds
      ..clear()
      ..addAll(favorites.map((f) => f.propertyId));
    return favorites;
  }

  Future<void> addFavorite(Property property) async {
    final res = await http.post(
      Uri.parse('${AppConfig.apiPrefix}/favorites'),
      headers: await _authHeaders(),
      body: _wrapBody({'propertyId': property.id}),
    );
    if (res.statusCode >= 400) {
      _throwFromResponse(res, _parseBody(res));
    }
    _favoritePropertyIds.add(property.id);
  }

  Future<void> removeFavorite(String propertyId) async {
    final res = await http.delete(
      Uri.parse('${AppConfig.apiPrefix}/favorites/$propertyId'),
      headers: await _authHeaders(),
    );
    if (res.statusCode >= 400 && res.statusCode != 404) {
      _throwFromResponse(res, _parseBody(res));
    }
    _favoritePropertyIds.remove(propertyId);
  }

  bool isFavorite(String propertyId) => _favoritePropertyIds.contains(propertyId);

  void clearSessionCache() {
    _favoritePropertyIds.clear();
    unawaited(OfflineStore.instance.clearSession());
  }

  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    final res = await http.post(
      Uri.parse('${AppConfig.apiPrefix}/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: _wrapBody({
        'email': email.trim(),
        'password': password,
      }),
    );
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    final map = _unwrapEnvelope(data) as Map<String, dynamic>;
    return AuthResponse(
      user: User.fromJson(map['user'] as Map<String, dynamic>),
      token: map['token'] as String,
    );
  }

  Future<AuthResponse> register({
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
    final request = http.MultipartRequest('POST', Uri.parse('${AppConfig.apiPrefix}/auth/register'));
    request.fields['email'] = email.trim();
    request.fields['password'] = password;
    request.fields['fullName'] = fullName.trim();
    request.fields['full_name'] = fullName.trim();
    request.fields['first_name'] = firstName.trim();
    request.fields['last_name'] = lastName.trim();
    request.fields['birth_date'] = birthDate;
    request.fields['gender'] = gender;
    request.fields['role'] = role.name;
    request.fields['id_card'] = idCard.trim();
    request.fields['phone'] = phone.trim();
    if (selfiePath != null && selfiePath.isNotEmpty) {
      request.files.add(await http.MultipartFile.fromPath('selfie', selfiePath));
    }
    if (idCardPhotoPath != null && idCardPhotoPath.isNotEmpty) {
      request.files.add(await http.MultipartFile.fromPath('id_card_photo', idCardPhotoPath));
    }
    if (idCardBackPath != null && idCardBackPath.isNotEmpty) {
      request.files.add(await http.MultipartFile.fromPath('id_card_back', idCardBackPath));
    }
    final streamed = await request.send();
    final res = await http.Response.fromStream(streamed);
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    final map = _unwrapEnvelope(data) as Map<String, dynamic>;
    return AuthResponse(
      user: User.fromJson(map['user'] as Map<String, dynamic>),
      token: map['token'] as String,
    );
  }

  @override
  Future<void> submitHostApplication({
    required String fullName,
    required String phone,
    String? city,
    String? message,
    String? idCard,
  }) async {
    await _jsonRequest(
      'POST',
      '/host-applications',
      body: _wrapBody({
        'full_name': fullName.trim(),
        'fullName': fullName.trim(),
        'phone': phone.trim(),
        if (city != null && city.trim().isNotEmpty) 'city': city.trim(),
        if (message != null && message.trim().isNotEmpty) 'message': message.trim(),
        if (idCard != null && idCard.trim().isNotEmpty) 'id_card': idCard.trim(),
      }),
      queue: true,
    );
  }

  @override
  Future<Map<String, dynamic>> getMyProfile() async {
    final res = await http.get(
      Uri.parse('${AppConfig.apiPrefix}/users/me'),
      headers: await _authHeaders(),
    );
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    return _unwrapEnvelope(data) as Map<String, dynamic>;
  }

  @override
  Future<Property> createProperty({
    required String title,
    required String description,
    required int price,
    required String location,
    required String propertyType,
    List<String> imagePaths = const [],
    String? checkInTime,
    String? checkOutTime,
    int? priceMidday,
    int? priceFullDay,
  }) async {
    final request = http.MultipartRequest('POST', Uri.parse('${AppConfig.apiPrefix}/properties'));
    final headers = await _authHeaders();
    headers.remove('Content-Type');
    request.headers.addAll(headers);
    request.fields['title'] = title.trim();
    request.fields['description'] = description.trim();
    request.fields['price'] = price.toString();
    request.fields['location'] = location.trim();
    request.fields['property_type'] = propertyType;
    if (checkInTime != null && checkInTime.isNotEmpty) request.fields['check_in_time'] = checkInTime;
    if (checkOutTime != null && checkOutTime.isNotEmpty) request.fields['check_out_time'] = checkOutTime;
    if (priceMidday != null && priceMidday > 0) request.fields['price_midday'] = priceMidday.toString();
    if (priceFullDay != null && priceFullDay > 0) request.fields['price_full_day'] = priceFullDay.toString();

    for (final path in imagePaths) {
      request.files.add(await http.MultipartFile.fromPath('images', path));
    }

    final streamed = await request.send();
    final res = await http.Response.fromStream(streamed);
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    return Property.fromJson(_unwrapEnvelope(data) as Map<String, dynamic>);
  }

  @override
  Future<VisitRequest> createVisitRequest(VisitRequestPayload payload) async {
    final data = await _jsonRequest(
      'POST',
      '/visit-requests',
      body: _wrapBody(payload.toJson()),
      queue: true,
    );
    return VisitRequest.fromJson(data as Map<String, dynamic>);
  }

  List<VisitRequest> _visitsFrom(dynamic unwrapped) {
    final list = unwrapped is List
        ? unwrapped
        : (unwrapped is Map && unwrapped['items'] is List)
            ? unwrapped['items'] as List
            : <dynamic>[];
    return list.map((e) => VisitRequest.fromJson(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<List<VisitRequest>> listMyVisitRequests() async {
    final unwrapped = await _jsonRequest('GET', '/visit-requests', cache: true);
    return _visitsFrom(unwrapped);
  }

  @override
  Future<VisitRequest> updateVisitRequestStatus(String id, String status) async {
    final data = await _jsonRequest(
      'PATCH',
      '/visit-requests/$id/status',
      body: _wrapBody({'status': status}),
      queue: true,
    );
    return VisitRequest.fromJson(data as Map<String, dynamic>);
  }

  @override
  Future<VisitRequest> requestStayExtension(String id, String checkOut) async {
    final data = await _jsonRequest(
      'POST',
      '/visit-requests/$id/extension',
      body: _wrapBody({'check_out': checkOut}),
      queue: true,
    );
    return VisitRequest.fromJson(data as Map<String, dynamic>);
  }

  @override
  Future<VisitRequest> markStayExtensionPaid(String id) async {
    final data = await _jsonRequest(
      'POST',
      '/visit-requests/$id/extension/paid',
      body: _wrapBody({}),
      queue: true,
    );
    return VisitRequest.fromJson(data as Map<String, dynamic>);
  }

  @override
  Future<VisitRequest> signStayAgreement(String id, String fullName) async {
    final data = await _jsonRequest(
      'POST',
      '/visit-requests/$id/agreement',
      body: _wrapBody({'full_name': fullName, 'accepted': true}),
      queue: true,
    );
    return VisitRequest.fromJson(data as Map<String, dynamic>);
  }

  @override
  Future<OwnerSubscription> getMySubscription() async {
    final res = await http.get(
      Uri.parse('${AppConfig.apiPrefix}/subscriptions/me'),
      headers: await _authHeaders(),
    );
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    return OwnerSubscription.fromJson(_unwrapEnvelope(data) as Map<String, dynamic>);
  }

  @override
  Future<Payment> startSubscriptionPayment() async {
    final res = await http.post(
      Uri.parse('${AppConfig.apiPrefix}/payments/subscription'),
      headers: await _authHeaders(),
      body: _wrapBody({}),
    );
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    return Payment.fromJson(_unwrapEnvelope(data) as Map<String, dynamic>);
  }

  @override
  Future<Payment> startReservationPayment(String visitRequestId) async {
    final res = await http.post(
      Uri.parse('${AppConfig.apiPrefix}/payments/reservation'),
      headers: await _authHeaders(),
      body: _wrapBody({'visitRequestId': visitRequestId}),
    );
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    return Payment.fromJson(_unwrapEnvelope(data) as Map<String, dynamic>);
  }

  @override
  Future<PropertyRatingsResult> getPropertyRatings(String propertyId) async {
    final res = await http.get(
      Uri.parse('${AppConfig.apiPrefix}/properties/$propertyId/ratings'),
      headers: await _authHeaders(),
    );
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    return _parseRatingsResult(data);
  }

  @override
  Future<PropertyRating> submitPropertyRating(String propertyId, SubmitRatingPayload payload) async {
    final res = await http.post(
      Uri.parse('${AppConfig.apiPrefix}/properties/$propertyId/ratings'),
      headers: await _authHeaders(),
      body: _wrapBody(payload.toJson()),
    );
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    return PropertyRating.fromJson(_unwrapEnvelope(data) as Map<String, dynamic>);
  }

  PropertyRatingsResult _parseRatingsResult(dynamic data) {
    if (data is Map && data['hasError'] == true) {
      final status = data['status'];
      final message = status is Map ? status['message'] as String? : null;
      throw Exception(message ?? 'Request failed');
    }
    if (data is Map && data.containsKey('ratings')) {
      final ratings = (data['ratings'] as List<dynamic>? ?? [])
          .map((e) => PropertyRating.fromJson(e as Map<String, dynamic>))
          .toList();
      final statsMap = data['statistics'];
      final stats = statsMap is Map<String, dynamic>
          ? RatingStats.fromJson(statsMap)
          : RatingStats.fromRatings(ratings);
      return PropertyRatingsResult(ratings: ratings, statistics: stats);
    }
    final unwrapped = _unwrapEnvelope(data);
    if (unwrapped is Map<String, dynamic>) {
      final ratings = (unwrapped['ratings'] as List<dynamic>? ?? unwrapped['items'] as List<dynamic>? ?? [])
          .map((e) => PropertyRating.fromJson(e as Map<String, dynamic>))
          .toList();
      final statsMap = unwrapped['statistics'] ?? unwrapped['stats'];
      final stats = statsMap is Map<String, dynamic>
          ? RatingStats.fromJson(statsMap)
          : RatingStats.fromRatings(ratings);
      return PropertyRatingsResult(ratings: ratings, statistics: stats);
    }
    return const PropertyRatingsResult(ratings: [], statistics: RatingStats(average: 0, count: 0));
  }
}
