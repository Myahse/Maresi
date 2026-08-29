import 'package:maresi_mobile/models/app_notification.dart';
import 'package:maresi_mobile/models/payment.dart';
import 'package:maresi_mobile/mock/data/mock_notifications.dart';
import 'package:maresi_mobile/mock/data/mock_properties.dart';
import 'package:maresi_mobile/mock/data/mock_ratings.dart';
import 'package:maresi_mobile/mock/data/mock_users.dart';
import 'package:maresi_mobile/models/property.dart';
import 'package:maresi_mobile/models/property_rating.dart';
import 'package:maresi_mobile/models/user.dart';
import 'package:maresi_mobile/models/visit_request.dart';
import 'package:maresi_mobile/services/maresi_api.dart';
import 'package:maresi_mobile/utils/property_photos.dart';

/// Offline API backed by seeded mock residences.
class MockApiService implements MaresiApi {
  MockApiService._() {
    _residences.addAll(MockProperties.seed());
    _ratings.addAll(MockRatings.seed());
  }

  static final MockApiService instance = MockApiService._();

  final List<Property> _residences = [];
  final List<VisitRequest> _visitRequests = [];
  final List<PropertyRating> _ratings = [];
  final Set<String> _favoriteIds = {};
  final List<AppNotification> _notifications = MockNotifications.unread();
  User? _sessionUser;
  bool _ownerSubscriptionActive = false;

  static const _mockToken = 'mock-jwt-token';
  static const _mockPhotoPool = [
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
    'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800',
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
  ];

  Future<void> _delay() => Future<void>.delayed(const Duration(milliseconds: 350));

  Property _findResidence(String id) => _residences.firstWhere(
        (p) => p.id == id,
        orElse: () => throw Exception('Résidence introuvable'),
      );

  @override
  Future<List<AppNotification>> listNotifications() async {
    await _delay();
    if (_sessionUser == null) return [];
    return List.unmodifiable(_notifications);
  }

  @override
  Future<void> markNotificationRead(String id) async {
    await _delay();
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index >= 0) {
      _notifications[index] = _notifications[index].copyWith(read: true);
    }
  }

  @override
  Future<void> markAllNotificationsRead() async {
    await _delay();
    for (var i = 0; i < _notifications.length; i++) {
      _notifications[i] = _notifications[i].copyWith(read: true);
    }
  }

  @override
  Future<List<Property>> listProperties({
    String? location,
    int? minPrice,
    int? maxPrice,
    String? propertyType,
  }) async {
    await _delay();
    var list = List<Property>.from(_residences);
    if (location != null && location.trim().isNotEmpty) {
      final q = location.toLowerCase();
      list = list.where((p) => p.location.toLowerCase().contains(q)).toList();
    }
    if (minPrice != null) {
      list = list.where((p) => p.price >= minPrice).toList();
    }
    if (maxPrice != null) {
      list = list.where((p) => p.price <= maxPrice).toList();
    }
    if (propertyType != null && propertyType.isNotEmpty) {
      list = list.where((p) => p.propertyType == propertyType).toList();
    }
    return list;
  }

  @override
  Future<Property> getProperty(String id) async {
    await _delay();
    return _findResidence(id);
  }

  @override
  Future<List<Favorite>> listFavorites() async {
    await _delay();
    if (_sessionUser == null) return [];
    return _favoriteIds.map((id) {
      final p = _findResidence(id);
      return Favorite(
        id: 'fav-$id',
        propertyId: id,
        createdAt: DateTime.now().toIso8601String(),
        title: p.title,
        price: p.price,
        location: p.location,
        propertyType: p.propertyType,
        images: p.images,
      );
    }).toList();
  }

  @override
  Future<void> addFavorite(Property property) async {
    await _delay();
    _favoriteIds.add(property.id);
  }

  @override
  Future<void> removeFavorite(String propertyId) async {
    await _delay();
    _favoriteIds.remove(propertyId);
  }

  @override
  bool isFavorite(String propertyId) => _favoriteIds.contains(propertyId);

  @override
  void clearSessionCache() {
    _favoriteIds.clear();
    _sessionUser = null;
  }

  @override
  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    await _delay();
    if (password.length < 6) {
      throw Exception('Identifiants incorrects');
    }
    final user = _userForEmail(email);
    _sessionUser = user;
    return AuthResponse(user: user, token: _mockToken);
  }

  @override
  Future<AuthResponse> register({
    required String email,
    required String password,
    required String fullName,
    required UserRole role,
  }) async {
    await _delay();
    if (password.length < 6 || fullName.trim().isEmpty) {
      throw Exception('Données invalides');
    }
    final user = User(
      id: role == UserRole.owner ? MockUsers.demoOwner.id : MockUsers.demoClient.id,
      email: email.trim(),
      fullName: fullName.trim(),
      role: role,
    );
    _sessionUser = user;
    return AuthResponse(user: user, token: _mockToken);
  }

  User _userForEmail(String email) {
    if (email == MockUsers.demoClient.email) return MockUsers.demoClient;
    if (email == MockUsers.demoOwner.email) return MockUsers.demoOwner;
    return User(
      id: MockUsers.demoClient.id,
      email: email.trim(),
      fullName: 'Utilisateur',
      role: UserRole.client,
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
    await _delay();
    if (_sessionUser == null) throw Exception('Authentification requise');
    if (!_ownerSubscriptionActive) {
      throw Exception('Abonnement propriétaire requis pour publier une résidence.');
    }
    if (imagePaths.length < kMinPropertyPhotos) {
      throw Exception('Ajoutez au moins $kMinPropertyPhotos photos du lieu.');
    }

    final images = List<String>.generate(
      imagePaths.length,
      (i) => _mockPhotoPool[i % _mockPhotoPool.length],
    );

    final residence = Property(
      id: 'mock-${DateTime.now().millisecondsSinceEpoch}',
      ownerId: _sessionUser!.id,
      title: title.startsWith('Résidence') ? title : 'Résidence — $title',
      description: description,
      price: price,
      location: location,
      propertyType: propertyType,
      images: images,
      ownerName: _sessionUser!.fullName,
      ownerEmail: _sessionUser!.email,
    );
    _residences.insert(0, residence);
    return residence;
  }

  @override
  Future<VisitRequest> createVisitRequest(VisitRequestPayload payload) async {
    await _delay();
    if (_sessionUser == null) throw Exception('Authentification requise');

    final property = _findResidence(payload.propertyId);
    final request = VisitRequest(
      id: 'vr-${DateTime.now().millisecondsSinceEpoch}',
      propertyId: payload.propertyId,
      status: 'awaiting_payment',
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      visitDate: payload.visitDate ?? '',
      visitTime: payload.visitTime ?? '',
      guestsCount: payload.guestsCount,
      contactPhone: payload.contactPhone,
      idCard: payload.idCard,
      message: payload.message,
      propertyTitle: property.title,
      location: property.location,
    );
    _visitRequests.insert(0, request);
    _notifications.insert(
      0,
      AppNotification(
        id: 'notif-${DateTime.now().millisecondsSinceEpoch}',
        title: 'Paiement requis',
        message: 'Votre demande pour "${property.title}" a été acceptée. Payez pour confirmer.',
        type: 'reservation',
        propertyId: property.id,
        createdAt: DateTime.now(),
      ),
    );
    return request;
  }

  @override
  Future<List<VisitRequest>> listMyVisitRequests() async {
    await _delay();
    if (_sessionUser == null) throw Exception('Authentification requise');
    return List.unmodifiable(_visitRequests);
  }

  @override
  Future<VisitRequest> updateVisitRequestStatus(String id, String status) async {
    await _delay();
    final index = _visitRequests.indexWhere((v) => v.id == id);
    if (index < 0) throw Exception('Demande introuvable');
    final current = _visitRequests[index];
    final updated = VisitRequest(
      id: current.id,
      propertyId: current.propertyId,
      status: status,
      checkIn: current.checkIn,
      checkOut: current.checkOut,
      visitDate: current.visitDate,
      visitTime: current.visitTime,
      guestsCount: current.guestsCount,
      contactPhone: current.contactPhone,
      idCard: current.idCard,
      message: current.message,
      propertyTitle: current.propertyTitle,
      location: current.location,
      propertyPrice: current.propertyPrice,
      wavePaymentUrl: current.wavePaymentUrl,
      orangeMoneyUrl: current.orangeMoneyUrl,
      ownerPhone: current.ownerPhone,
    );
    _visitRequests[index] = updated;
    return updated;
  }

  @override
  Future<OwnerSubscription> getMySubscription() async {
    await _delay();
    if (_sessionUser == null) throw Exception('Authentification requise');
    return OwnerSubscription(
      status: _ownerSubscriptionActive ? 'active' : 'inactive',
      priceFcfa: 10000,
      active: _ownerSubscriptionActive,
      expiresAt: _ownerSubscriptionActive ? DateTime.now().add(const Duration(days: 30)) : null,
    );
  }

  @override
  Future<Payment> startSubscriptionPayment() async {
    await _delay();
    if (_sessionUser == null) throw Exception('Authentification requise');
    if (_sessionUser!.role != UserRole.owner) {
      throw Exception('Abonnement réservé aux propriétaires');
    }
    _ownerSubscriptionActive = true;
    return Payment(
      id: 'pay-sub-${DateTime.now().millisecondsSinceEpoch}',
      type: 'subscription',
      amount: 10000,
      status: 'completed',
      checkoutUrl: null,
    );
  }

  @override
  Future<Payment> startReservationPayment(String visitRequestId) async {
    await _delay();
    if (_sessionUser == null) throw Exception('Authentification requise');
    final index = _visitRequests.indexWhere((v) => v.id == visitRequestId);
    if (index < 0) throw Exception('Demande introuvable');
    final current = _visitRequests[index];
    if (current.status != 'awaiting_payment') {
      throw Exception("La réservation n'attend pas de paiement");
    }
    final property = _findResidence(current.propertyId);
    final amount = property.price.toDouble();
    final commission = 0.0;
    _visitRequests[index] = VisitRequest(
      id: current.id,
      propertyId: current.propertyId,
      status: 'confirmed',
      checkIn: current.checkIn,
      checkOut: current.checkOut,
      visitDate: current.visitDate,
      visitTime: current.visitTime,
      guestsCount: current.guestsCount,
      contactPhone: current.contactPhone,
      idCard: current.idCard,
      message: current.message,
      propertyTitle: current.propertyTitle,
      location: current.location,
    );
    return Payment(
      id: 'pay-res-${DateTime.now().millisecondsSinceEpoch}',
      type: 'reservation',
      visitRequestId: visitRequestId,
      amount: amount,
      commissionAmount: commission,
      ownerAmount: amount - commission,
      status: 'completed',
      checkoutUrl: null,
    );
  }

  void _updatePropertyRatingStats(String propertyId) {
    final propertyRatings = _ratings.where((r) => r.propertyId == propertyId).toList();
    final stats = RatingStats.fromRatings(propertyRatings);
    final index = _residences.indexWhere((p) => p.id == propertyId);
    if (index < 0) return;
    final current = _residences[index];
    _residences[index] = current.copyWith(
      averageRating: stats.count > 0 ? stats.average : null,
      ratingCount: stats.count > 0 ? stats.count : null,
    );
  }

  @override
  Future<PropertyRatingsResult> getPropertyRatings(String propertyId) async {
    await _delay();
    final ratings = _ratings.where((r) => r.propertyId == propertyId).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return PropertyRatingsResult(
      ratings: ratings,
      statistics: RatingStats.fromRatings(ratings),
    );
  }

  @override
  Future<PropertyRating> submitPropertyRating(String propertyId, SubmitRatingPayload payload) async {
    await _delay();
    if (_sessionUser == null) throw Exception('Authentification requise');
    if (payload.score < 1 || payload.score > 5) throw Exception('Note invalide');

    _findResidence(propertyId);

    final existingIndex = _ratings.indexWhere(
      (r) => r.propertyId == propertyId && r.userId == _sessionUser!.id,
    );
    final rating = PropertyRating(
      id: existingIndex >= 0 ? _ratings[existingIndex].id : 'r-${DateTime.now().millisecondsSinceEpoch}',
      propertyId: propertyId,
      userId: _sessionUser!.id,
      userName: _sessionUser!.fullName,
      score: payload.score,
      comment: payload.comment,
      createdAt: DateTime.now(),
    );

    if (existingIndex >= 0) {
      _ratings[existingIndex] = rating;
    } else {
      _ratings.insert(0, rating);
    }

    _updatePropertyRatingStats(propertyId);
    return rating;
  }
}
