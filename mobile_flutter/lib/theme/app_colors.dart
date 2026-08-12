import 'package:flutter/material.dart';

/// Maresi brand palette — keep in sync with web/src/theme/brand.ts
abstract final class AppColors {
  static const primary = Color(0xFF0D9488);
  static const primaryDark = Color(0xFF115E59);
  static const primaryLight = Color(0xFF14B8A6);
  static const primaryForeground = Color(0xFFFFFFFF);

  /// Header / hero gradients (teal, same roles as immo layout greens)
  static const gradientStart = primaryDark;
  static const gradientEnd = primary;
  static const ctaStart = primary;
  static const ctaEnd = primaryDark;
  static const accent = primary;

  static const background = Color(0xFFF5F5F5);
  static const surface = Color(0xFFFFFFFF);
  static const text = Color(0xFF333333);
  static const textSecondary = Color(0xFF6B7280);
  static const textLight = Color(0xFF999999);
  static const border = Color(0xFFE0E0E0);
  static const inputBorder = Color(0xFFD1D5DB);
  static const error = Color(0xFFEF4444);
  static const favorite = Color(0xFFFF6B6B);
  static const heartInactive = Color(0xFF666666);
  static const pillBg = Color(0xFFF5F5F5);
  static const navActiveBg = Color(0xFFECFEFF);
}

abstract final class AppSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const xl = 32.0;
  static const xxl = 48.0;
}

abstract final class AppGradients {
  static const header = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.gradientStart, AppColors.gradientEnd],
  );

  static const cta = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [AppColors.ctaStart, AppColors.ctaEnd],
  );

  static const provider = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [AppColors.primaryDark, AppColors.primary],
  );

  static const cardOverlay = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Colors.transparent, Color(0xB3000000)],
  );
}
