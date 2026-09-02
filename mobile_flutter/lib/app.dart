import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:maresi_mobile/providers/auth_provider.dart';
import 'package:maresi_mobile/providers/favorites_provider.dart';
import 'package:maresi_mobile/providers/location_provider.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/screens/app_navigator.dart';
import 'package:maresi_mobile/services/api_service.dart';
import 'package:maresi_mobile/services/auth_service.dart';
import 'package:maresi_mobile/services/maresi_client.dart';
import 'package:maresi_mobile/theme/app_theme.dart';
import 'package:maresi_mobile/widgets/offline_banner.dart';
import 'package:provider/provider.dart';

class MaresiApp extends StatefulWidget {
  const MaresiApp({super.key});

  @override
  State<MaresiApp> createState() => _MaresiAppState();
}

class _MaresiAppState extends State<MaresiApp> {
  late final AuthService _authService;
  late final AuthProvider _authProvider;
  late final FavoritesProvider _favoritesProvider;
  late final LocaleProvider _localeProvider;
  late final LocationProvider _locationProvider;

  @override
  void initState() {
    super.initState();
    final api = maresiApi;
    _authService = AuthService(api);
    _authProvider = AuthProvider(_authService);
    if (api is ApiService) {
      api.onUnauthorized = _authProvider.syncAfterRemoteLogout;
    }
    _favoritesProvider = FavoritesProvider(api);
    _localeProvider = LocaleProvider();
    _locationProvider = LocationProvider();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _authProvider),
        ChangeNotifierProvider.value(value: _favoritesProvider),
        ChangeNotifierProvider.value(value: _localeProvider),
        ChangeNotifierProvider.value(value: _locationProvider),
      ],
      child: Consumer<LocaleProvider>(
        builder: (context, locale, _) {
          return MaterialApp(
            title: 'Maresi',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light,
            darkTheme: AppTheme.dark,
            themeMode: ThemeMode.system,
            locale: Locale(locale.locale),
            supportedLocales: const [Locale('fr'), Locale('en')],
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            builder: (context, child) {
              return Column(
                children: [
                  const OfflineBanner(),
                  Expanded(child: child ?? const SizedBox.shrink()),
                ],
              );
            },
            home: const AppNavigator(),
          );
        },
      ),
    );
  }
}
