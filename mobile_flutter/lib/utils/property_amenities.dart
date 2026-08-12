import 'package:flutter/material.dart';
import 'package:maresi_mobile/models/property.dart';
import 'package:maresi_mobile/models/property_types.dart';

enum PropertyAmenityId {
  wifi,
  ac,
  parking,
  security,
  pool,
  kitchen,
  balcony,
  garage,
  hotWater,
  furnished,
}

IconData amenityIcon(PropertyAmenityId id) => switch (id) {
      PropertyAmenityId.wifi => Icons.wifi,
      PropertyAmenityId.ac => Icons.ac_unit_outlined,
      PropertyAmenityId.parking => Icons.local_parking_outlined,
      PropertyAmenityId.security => Icons.security_outlined,
      PropertyAmenityId.pool => Icons.pool_outlined,
      PropertyAmenityId.kitchen => Icons.kitchen_outlined,
      PropertyAmenityId.balcony => Icons.balcony_outlined,
      PropertyAmenityId.garage => Icons.garage_outlined,
      PropertyAmenityId.hotWater => Icons.water_drop_outlined,
      PropertyAmenityId.furnished => Icons.weekend_outlined,
    };

String amenityLabelKey(PropertyAmenityId id) => 'details.amenity.${id.name}';

/// Infers amenities from the residence description and type.
List<PropertyAmenityId> inferPropertyAmenities(Property property) {
  final text = property.description.toLowerCase();
  final amenities = <PropertyAmenityId>{};

  void match(String keyword, PropertyAmenityId id) {
    if (text.contains(keyword)) amenities.add(id);
  }

  match('fibre', PropertyAmenityId.wifi);
  match('wifi', PropertyAmenityId.wifi);
  match('climat', PropertyAmenityId.ac);
  match('parking', PropertyAmenityId.parking);
  match('gardien', PropertyAmenityId.security);
  match('sécurité', PropertyAmenityId.security);
  match('securite', PropertyAmenityId.security);
  match('piscine', PropertyAmenityId.pool);
  match('cuisine', PropertyAmenityId.kitchen);
  match('balcon', PropertyAmenityId.balcony);
  match('terrasse', PropertyAmenityId.balcony);
  match('garage', PropertyAmenityId.garage);
  match('eau chaude', PropertyAmenityId.hotWater);
  match('meubl', PropertyAmenityId.furnished);

  switch (property.propertyType) {
    case PropertyTypes.studio:
      amenities.add(PropertyAmenityId.furnished);
    case PropertyTypes.apartment:
      amenities.add(PropertyAmenityId.security);
    case PropertyTypes.house:
      amenities.add(PropertyAmenityId.parking);
    default:
      break;
  }

  if (amenities.isEmpty) {
    amenities.addAll([PropertyAmenityId.ac, PropertyAmenityId.security]);
  }

  return amenities.toList();
}
