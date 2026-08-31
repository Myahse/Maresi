import 'package:maresi_mobile/config/app_config.dart';

/// Turn stored listing URLs into something the app can load.
String listingImageUrl(String url) {
  if (url.isEmpty) return url;
  final origin = AppConfig.apiBaseUrl;
  final r2 = RegExp(
    r'r2\.cloudflarestorage\.com/(?:[^/?#]+/)?(properties/[A-Za-z0-9._-]+)',
    caseSensitive: false,
  ).firstMatch(url);
  if (r2 != null) {
    return '$origin/api/media/${r2.group(1)}';
  }
  if (url.startsWith('/')) {
    return '$origin$url';
  }
  return url;
}
