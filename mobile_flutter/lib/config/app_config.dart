class AppConfig {
  /// Override via `--dart-define=API_URL=http://YOUR_IP:4000` (physical device or iOS simulator).
  /// Default targets the Android emulator host loopback.
  static const apiBaseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:4000',
  );

  static String get apiPrefix => '$apiBaseUrl/api';

  /// `flutter run --dart-define=USE_MOCK=true` for offline demo data.
  static const useMockData = bool.fromEnvironment('USE_MOCK', defaultValue: false);

  static const listingBaseUrl = String.fromEnvironment(
    'LISTING_URL',
    defaultValue: 'https://ma-resi.com',
  );

  static String listingPageUrl(String id) =>
      '${listingBaseUrl.replaceAll(RegExp(r'/+$'), '')}/properties/$id';

  static String get termsUrl =>
      '${listingBaseUrl.replaceAll(RegExp(r'/+$'), '')}/terms';
}
