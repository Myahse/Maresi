import 'package:flutter/material.dart';
import 'package:maresi_mobile/l10n/app_strings.dart';

class LocaleProvider extends ChangeNotifier {
  AppLocale _locale = 'fr';

  AppLocale get locale => _locale;

  String t(String key) => AppStrings.t(_locale, key);

  void load() {
    // App is French-first; locale stays fixed unless changed explicitly later.
  }

  void setLocale(AppLocale locale) {
    if (_locale == locale) return;
    _locale = locale;
    notifyListeners();
  }
}
