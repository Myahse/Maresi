import 'package:flutter/material.dart';
import 'package:maresi_mobile/providers/auth_provider.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/screens/main_shell.dart';
import 'package:maresi_mobile/screens/onboarding_screen.dart';
import 'package:maresi_mobile/screens/splash_screen.dart';
import 'package:provider/provider.dart';

/// Splash → onboarding (or home if already signed in).
class AppNavigator extends StatefulWidget {
  const AppNavigator({super.key});

  @override
  State<AppNavigator> createState() => _AppNavigatorState();
}

class _AppNavigatorState extends State<AppNavigator> {
  bool _splashDone = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _runSplash());
  }

  Future<void> _runSplash() async {
    final locale = context.read<LocaleProvider>();
    final auth = context.read<AuthProvider>();
    locale.load();
    await Future.wait([
      auth.bootstrap(),
      Future<void>.delayed(const Duration(milliseconds: 2000)),
    ]);
    if (mounted) setState(() => _splashDone = true);
  }

  @override
  Widget build(BuildContext context) {
    if (!_splashDone) return const SplashScreen();

    final auth = context.watch<AuthProvider>();
    if (auth.isAuthenticated) return const MainShell();

    return const OnboardingScreen();
  }
}
