import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:maresi_mobile/config/app_config.dart';
import 'package:maresi_mobile/models/app_notification.dart';
import 'package:maresi_mobile/models/payment.dart';
import 'package:maresi_mobile/models/property.dart';
import 'package:maresi_mobile/models/property_rating.dart';
import 'package:maresi_mobile/models/user.dart';
import 'package:maresi_mobile/models/visit_request.dart';
import 'package:maresi_mobile/services/maresi_api.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// HTTP client for the Maresi Spring Boot API.
class ApiService implements MaresiApi {
  ApiService._();
  static final ApiService instance = ApiService._();

  final Set<String> _favoritePropertyIds = {};

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

    final uri = Uri.parse('${AppConfig.apiPrefix}/properties').replace(
      queryParameters: query.isEmpty ? null : query,
    );
    final res = await http.get(uri, headers: await _authHeaders());
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    final list = _unwrapEnvelope(data) as List<dynamic>? ?? [];
    return list.map((e) => Property.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Property> getProperty(String id) async {
    final res = await http.get(
      Uri.parse('${AppConfig.apiPrefix}/properties/$id'),
      headers: await _authHeaders(),
    );
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    return Property.fromJson(_unwrapEnvelope(data) as Map<String, dynamic>);
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

  void clearSessionCache() => _favoritePropertyIds.clear();

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
    required UserRole role,
    required String idCard,
    String? selfiePath,
    String? idCardPhotoPath,
  }) async {
    final request = http.MultipartRequest('POST', Uri.parse('${AppConfig.apiPrefix}/auth/register'));
    request.fields['email'] = email.trim();
    request.fields['password'] = password;
    request.fields['fullName'] = fullName.trim();
    request.fields['full_name'] = fullName.trim();
    request.fields['role'] = role.name;
    request.fields['id_card'] = idCard.trim();
    if (selfiePath != null && selfiePath.isNotEmpty) {
      request.files.add(await http.MultipartFile.fromPath('selfie', selfiePath));
    }
    if (idCardPhotoPath != null && idCardPhotoPath.isNotEmpty) {
      request.files.add(await http.MultipartFile.fromPath('id_card_photo', idCardPhotoPath));
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
  Future<Property> createProperty({
    required String title,
    required String description,
    required int price,
    required String location,
    required String propertyType,
    List<String> imagePaths = const [],
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
    final res = await http.post(
      Uri.parse('${AppConfig.apiPrefix}/visit-requests'),
      headers: await _authHeaders(),
      body: _wrapBody(payload.toJson()),
    );
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    return VisitRequest.fromJson(_unwrapEnvelope(data) as Map<String, dynamic>);
  }

  @override
  Future<List<VisitRequest>> listMyVisitRequests() async {
    final res = await http.get(
      Uri.parse('${AppConfig.apiPrefix}/visit-requests'),
      headers: await _authHeaders(),
    );
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    final unwrapped = _unwrapEnvelope(data);
    final list = unwrapped is List
        ? unwrapped
        : (unwrapped is Map && unwrapped['items'] is List)
            ? unwrapped['items'] as List
            : (data is Map && data['items'] is List)
                ? data['items'] as List
                : <dynamic>[];
    return list.map((e) => VisitRequest.fromJson(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<VisitRequest> updateVisitRequestStatus(String id, String status) async {
    final res = await http.patch(
      Uri.parse('${AppConfig.apiPrefix}/visit-requests/$id/status'),
      headers: await _authHeaders(),
      body: _wrapBody({'status': status}),
    );
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    return VisitRequest.fromJson(_unwrapEnvelope(data) as Map<String, dynamic>);
  }

  @override
  Future<VisitRequest> signStayAgreement(String id, String fullName) async {
    final res = await http.post(
      Uri.parse('${AppConfig.apiPrefix}/visit-requests/$id/agreement'),
      headers: await _authHeaders(),
      body: _wrapBody({'full_name': fullName, 'accepted': true}),
    );
    final data = _parseBody(res);
    if (res.statusCode >= 400) _throwFromResponse(res, data);
    return VisitRequest.fromJson(_unwrapEnvelope(data) as Map<String, dynamic>);
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
