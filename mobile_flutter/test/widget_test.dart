import 'package:flutter_test/flutter_test.dart';
import 'package:maresi_mobile/app.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Maresi app shows onboarding after splash', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const MaresiApp());
    await tester.pump();
    await tester.pump(const Duration(seconds: 3));
    expect(find.text('Bienvenue sur Maresi'), findsOneWidget);
    expect(find.text("S'inscrire"), findsOneWidget);
  });
}
