import 'package:maresi_mobile/mock/data/mock_ids.dart';
import 'package:maresi_mobile/models/user.dart';

abstract final class MockUsers {
  static const demoClient = User(
    id: MockIds.clientId,
    email: 'client@maresi.com',
    fullName: 'Aya Koné',
    role: UserRole.client,
    phone: '+2250700000001',
  );

  static const demoOwner = User(
    id: MockIds.ownerId,
    email: 'owner@maresi.com',
    fullName: 'Moussa Diallo',
    role: UserRole.owner,
    phone: '+2250700000002',
  );

  static const demoPassword = 'demo123';
}
