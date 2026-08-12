import 'package:maresi_mobile/mock/data/mock_ids.dart';
import 'package:maresi_mobile/models/property_rating.dart';

abstract final class MockRatings {
  static List<PropertyRating> seed() => [
        PropertyRating(
          id: 'r-mock-1',
          propertyId: MockIds.propertyCocody,
          userId: 'u-mock-1',
          userName: 'Kouadio M.',
          score: 5,
          comment: 'Excellent emplacement et résidence très propre.',
          createdAt: DateTime.now().subtract(const Duration(days: 5)),
        ),
        PropertyRating(
          id: 'r-mock-2',
          propertyId: MockIds.propertyCocody,
          userId: 'u-mock-2',
          userName: 'Fatou B.',
          score: 4,
          comment: 'Très bon séjour, propriétaire réactif.',
          createdAt: DateTime.now().subtract(const Duration(days: 12)),
        ),
        PropertyRating(
          id: 'r-mock-3',
          propertyId: MockIds.propertyMarcory,
          userId: 'u-mock-3',
          userName: 'Aya K.',
          score: 5,
          comment: 'Villa spacieuse, quartier calme.',
          createdAt: DateTime.now().subtract(const Duration(days: 3)),
        ),
      ];
}
