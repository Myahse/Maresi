import 'package:maresi_mobile/mock/data/mock_ids.dart';
import 'package:maresi_mobile/models/app_notification.dart';

abstract final class MockNotifications {
  static List<AppNotification> unread() => [
        AppNotification(
          id: MockIds.notif1,
          title: 'Demande de visite envoyée',
          message: 'Votre demande pour "Résidence 3 pièces — Cocody" a été soumise.',
          type: 'reservation',
          propertyId: MockIds.propertyCocody,
          createdAt: DateTime.now().subtract(const Duration(hours: 2)),
        ),
        AppNotification(
          id: MockIds.notif2,
          title: 'Nouvelle résidence',
          message: 'Une résidence villa est disponible à Marcory.',
          type: 'listing',
          propertyId: MockIds.propertyMarcory,
          createdAt: DateTime.now().subtract(const Duration(days: 1)),
        ),
      ];
}
