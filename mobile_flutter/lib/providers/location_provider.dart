import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:maresi_mobile/services/location_service.dart';
import 'package:maresi_mobile/services/maresi_client.dart';

enum LocationStatus { idle, loading, granted, denied, serviceDisabled }

class LocationProvider extends ChangeNotifier {
  LocationProvider({LocationService? service}) : _service = service ?? LocationService() {
    unawaited(_resumeIfGranted());
  }

  final LocationService _service;
  LocationStatus _status = LocationStatus.idle;
  String? _label;
  Position? _position;
  StreamSubscription<Position>? _watch;
  DateTime? _lastSyncAt;
  Position? _lastSyncedPosition;

  LocationStatus get status => _status;
  String? get label => _label;
  Position? get position => _position;
  bool get hasLocation => _status == LocationStatus.granted && _label != null && _label!.isNotEmpty;

  Future<void> _resumeIfGranted() async {
    final permission = await _service.checkPermission();
    if (permission == LocationPermission.always || permission == LocationPermission.whileInUse) {
      await requestLocation();
    }
  }

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
      await _applyPosition(position);
      _startWatch();
      return true;
    } catch (_) {
      _label = null;
      _status = LocationStatus.denied;
      notifyListeners();
      return false;
    }
  }

  void _startWatch() {
    _watch?.cancel();
    _watch = _service.watchPosition().listen((position) {
      unawaited(_applyPosition(position));
    });
  }

  Future<void> _applyPosition(Position position) async {
    _position = position;
    _label = await _service.reverseGeocode(position);
    _label ??= 'Abidjan';
    _status = LocationStatus.granted;
    notifyListeners();
    unawaited(_syncToServer(position));
  }

  Future<void> _syncToServer(Position position) async {
    final lastAt = _lastSyncAt;
    final lastPos = _lastSyncedPosition;
    if (lastAt != null && lastPos != null) {
      final moved = Geolocator.distanceBetween(
        lastPos.latitude,
        lastPos.longitude,
        position.latitude,
        position.longitude,
      );
      if (DateTime.now().difference(lastAt) < const Duration(minutes: 30) && moved < 400) {
        return;
      }
    }
    try {
      await maresiApi.updateMyLocation(
        latitude: position.latitude,
        longitude: position.longitude,
        locationLabel: _label,
      );
      _lastSyncAt = DateTime.now();
      _lastSyncedPosition = position;
    } catch (_) {
      /* guest may be signed out */
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

  @override
  void dispose() {
    _watch?.cancel();
    super.dispose();
  }
}
