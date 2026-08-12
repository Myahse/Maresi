import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:maresi_mobile/services/location_service.dart';

enum LocationStatus { idle, loading, granted, denied, serviceDisabled }

class LocationProvider extends ChangeNotifier {
  LocationProvider({LocationService? service}) : _service = service ?? LocationService();

  final LocationService _service;
  LocationStatus _status = LocationStatus.idle;
  String? _label;

  LocationStatus get status => _status;
  String? get label => _label;
  bool get hasLocation => _status == LocationStatus.granted && _label != null && _label!.isNotEmpty;

  Future<bool> requestLocation() async {
    if (_status == LocationStatus.loading) return false;

    _status = LocationStatus.loading;
    notifyListeners();

    try {
      if (!await _service.isServiceEnabled()) {
        _status = LocationStatus.serviceDisabled;
        notifyListeners();
        return false;
      }

      var permission = await _service.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await _service.requestPermission();
      }

      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        _status = LocationStatus.denied;
        notifyListeners();
        return false;
      }

      final position = await _service.getCurrentPosition();
      _label = await _service.reverseGeocode(position);
      _label ??= 'Abidjan';
      _status = LocationStatus.granted;
      notifyListeners();
      return true;
    } catch (_) {
      _label = null;
      _status = LocationStatus.denied;
      notifyListeners();
      return false;
    }
  }

  Future<void> openSettings() async {
    final enabled = await _service.isServiceEnabled();
    if (!enabled) {
      await Geolocator.openLocationSettings();
      return;
    }
    await Geolocator.openAppSettings();
  }
}
