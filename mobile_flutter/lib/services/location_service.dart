import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';

class LocationService {
  static const _timeout = Duration(seconds: 12);

  Future<bool> isServiceEnabled() => Geolocator.isLocationServiceEnabled();

  Future<LocationPermission> checkPermission() => Geolocator.checkPermission();

  Future<LocationPermission> requestPermission() => Geolocator.requestPermission();

  Future<Position> getCurrentPosition() {
    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.medium,
        timeLimit: _timeout,
      ),
    ).timeout(_timeout);
  }

  Future<String?> reverseGeocode(Position position) async {
    final placemarks = await placemarkFromCoordinates(
      position.latitude,
      position.longitude,
    ).timeout(_timeout);
    if (placemarks.isEmpty) return null;

    final place = placemarks.first;
    final city = place.locality?.trim();
    final subAdmin = place.subAdministrativeArea?.trim();
    final admin = place.administrativeArea?.trim();
    final country = place.country?.trim();

    if (city != null && city.isNotEmpty) {
      if (admin != null && admin.isNotEmpty && admin != city) return '$city, $admin';
      return city;
    }
    if (subAdmin != null && subAdmin.isNotEmpty) return subAdmin;
    if (admin != null && admin.isNotEmpty) return admin;
    return country;
  }
}
