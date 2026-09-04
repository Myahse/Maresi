import 'package:maresi_mobile/utils/listing_image.dart';

class Property {
  const Property({
    required this.id,
    required this.ownerId,
    required this.title,
    required this.description,
    required this.price,
    required this.location,
    required this.propertyType,
    required this.images,
    this.isActive = true,
    this.ownerName,
    this.ownerEmail,
    this.ownerPhone,
    this.averageRating,
    this.ratingCount,
    this.bedrooms,
    this.maxGuests,
    this.amenities = const [],
    this.priceUnit = "night",
    this.premiumPositioning = false,
  });

  final String id;
  final String ownerId;
  final String title;
  final String description;
  final int price;
  final String location;
  final String propertyType;
  final List<String> images;
  final bool isActive;
  final String? ownerName;
  final String? ownerEmail;
  final String? ownerPhone;
  final double? averageRating;
  final int? ratingCount;
  final int? bedrooms;
  final int? maxGuests;
  final List<String> amenities;
  final String priceUnit;
  final bool premiumPositioning;

  factory Property.fromJson(Map<String, dynamic> json) {
    return Property(
      id: json['id'].toString(),
      ownerId: json['owner_id']?.toString() ?? json['ownerId']?.toString() ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      price: (json['price'] as num?)?.toInt() ?? 0,
      location: json['location'] as String? ?? '',
      propertyType: json['property_type'] as String? ?? json['propertyType'] as String? ?? '',
      images: (json['images'] as List<dynamic>?)
              ?.map((e) => listingImageUrl(e.toString()))
              .toList() ??
          const [],
      isActive: json['is_active'] as bool? ?? json['isActive'] as bool? ?? true,
      ownerName: json['owner_name'] as String? ?? json['ownerName'] as String?,
      ownerEmail: json['owner_email'] as String? ?? json['ownerEmail'] as String?,
      ownerPhone: json['owner_phone'] as String? ?? json['ownerPhone'] as String?,
      averageRating: (json['average_rating'] as num?)?.toDouble(),
      ratingCount: (json['rating_count'] as num?)?.toInt(),
      bedrooms: (json['bedrooms'] as num?)?.toInt(),
      maxGuests: (json['max_guests'] as num?)?.toInt(),
      amenities: (json['amenities'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      priceUnit: json['price_unit'] as String? ?? 'night',
      premiumPositioning: json['premium_positioning'] as bool? ?? json['premiumPositioning'] as bool? ?? false,
    );
  }

  Property copyWith({
    double? averageRating,
    int? ratingCount,
  }) {
    return Property(
      id: id,
      ownerId: ownerId,
      title: title,
      description: description,
      price: price,
      location: location,
      propertyType: propertyType,
      images: images,
      isActive: isActive,
      ownerName: ownerName,
      ownerEmail: ownerEmail,
      ownerPhone: ownerPhone,
      averageRating: averageRating ?? this.averageRating,
      ratingCount: ratingCount ?? this.ratingCount,
      bedrooms: bedrooms,
      maxGuests: maxGuests,
      amenities: amenities,
      priceUnit: priceUnit,
      premiumPositioning: premiumPositioning,
    );
  }
}

class Favorite {
  const Favorite({
    required this.id,
    required this.propertyId,
    required this.createdAt,
    this.title,
    this.price,
    this.location,
    this.propertyType,
    this.images = const [],
    this.bedrooms,
    this.maxGuests,
    this.amenities = const [],
  });

  final String id;
  final String propertyId;
  final String createdAt;
  final String? title;
  final int? price;
  final String? location;
  final String? propertyType;
  final List<String> images;
  final int? bedrooms;
  final int? maxGuests;
  final List<String> amenities;

  factory Favorite.fromJson(Map<String, dynamic> json) {
    return Favorite(
      id: json['id'].toString(),
      propertyId: json['property_id']?.toString() ?? json['propertyId']?.toString() ?? '',
      createdAt: json['created_at'] as String? ?? json['createdAt'] as String? ?? '',
      title: json['title'] as String?,
      price: (json['price'] as num?)?.toInt(),
      location: json['location'] as String?,
      propertyType: json['property_type'] as String? ?? json['propertyType'] as String?,
      images: (json['images'] as List<dynamic>?)
              ?.map((e) => listingImageUrl(e.toString()))
              .toList() ??
          const [],
      bedrooms: (json['bedrooms'] as num?)?.toInt(),
      maxGuests: (json['max_guests'] as num?)?.toInt(),
      amenities: (json['amenities'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
    );
  }

  Property toProperty() => Property(
        id: propertyId,
        ownerId: '',
        title: title ?? '',
        description: '',
        price: price ?? 0,
        location: location ?? '',
        propertyType: propertyType ?? '',
        images: images,
        bedrooms: bedrooms,
        maxGuests: maxGuests,
        amenities: amenities,
      );
}
