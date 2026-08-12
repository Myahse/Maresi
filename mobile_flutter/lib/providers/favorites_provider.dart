import 'package:flutter/material.dart';
import 'package:maresi_mobile/models/property.dart';
import 'package:maresi_mobile/services/maresi_api.dart';

class FavoritesProvider extends ChangeNotifier {
  FavoritesProvider(this._api);

  final MaresiApi _api;
  List<Favorite> _favorites = [];
  bool _loading = false;

  List<Favorite> get favorites => List.unmodifiable(_favorites);
  bool get loading => _loading;

  bool isFavorite(String propertyId) => _api.isFavorite(propertyId);

  Future<void> load() async {
    _loading = true;
    notifyListeners();
    try {
      _favorites = await _api.listFavorites();
    } catch (_) {
      _favorites = [];
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> toggle(Property property) async {
    try {
      if (_api.isFavorite(property.id)) {
        await _api.removeFavorite(property.id);
      } else {
        await _api.addFavorite(property);
      }
      _favorites = await _api.listFavorites();
    } catch (_) {
      // keep current list on failure
    }
    notifyListeners();
  }
}
