import 'package:maresi_mobile/models/app_notification.dart';
import 'package:maresi_mobile/models/payment.dart';
import 'package:maresi_mobile/models/property.dart';
import 'package:maresi_mobile/models/property_rating.dart';
import 'package:maresi_mobile/models/user.dart';
import 'package:maresi_mobile/models/visit_request.dart';

/// Shared API surface for live backend and mock data.
abstract class MaresiApi {
  Future<List<AppNotification>> listNotifications();
  Future<void> markNotificationRead(String id);
  Future<void> markAllNotificationsRead();

  Future<List<Property>> listProperties({
    String? location,
    int? minPrice,
    int? maxPrice,
    String? propertyType,
  });

  Future<Property> getProperty(String id);
  Future<List<Favorite>> listFavorites();
  Future<void> addFavorite(Property property);
  Future<void> removeFavorite(String propertyId);
  bool isFavorite(String propertyId);
  void clearSessionCache();

  Future<AuthResponse> login({
    required String email,
    required String password,
  });

  Future<void> resendVerification(String email);

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
  });

  Future<Map<String, dynamic>> getMyProfile();

  Future<void> updateMyLocation({
    required double latitude,
    required double longitude,
    String? locationLabel,
  });

  Future<void> submitHostApplication({
    required String fullName,
    required String phone,
    String? city,
    String? message,
    String? idCard,
  });

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
  });

  Future<VisitRequest> createVisitRequest(VisitRequestPayload payload);

  Future<List<VisitRequest>> listMyVisitRequests();

  Future<VisitRequest> updateVisitRequestStatus(String id, String status);

  Future<VisitRequest> requestStayExtension(String id, String checkOut);

  Future<VisitRequest> markStayExtensionPaid(String id);

  Future<VisitRequest> signStayAgreement(String id, String fullName);

  Future<OwnerSubscription> getMySubscription();

  Future<Payment> startSubscriptionPayment();

  Future<Payment> startReservationPayment(String visitRequestId);

  Future<PropertyRatingsResult> getPropertyRatings(String propertyId);

  Future<PropertyRating> submitPropertyRating(String propertyId, SubmitRatingPayload payload);
}
