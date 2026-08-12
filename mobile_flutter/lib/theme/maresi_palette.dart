import 'package:flutter/material.dart';

@immutable
class MaresiPalette extends ThemeExtension<MaresiPalette> {
  const MaresiPalette({
    required this.surface,
    required this.text,
    required this.textSecondary,
    required this.textLight,
    required this.border,
    required this.inputBorder,
    required this.pillBg,
    required this.navActiveBg,
    required this.heartInactive,
    required this.menuBorder,
    required this.sheetShadow,
  });

  final Color surface;
  final Color text;
  final Color textSecondary;
  final Color textLight;
  final Color border;
  final Color inputBorder;
  final Color pillBg;
  final Color navActiveBg;
  final Color heartInactive;
  final Color menuBorder;
  final Color sheetShadow;

  static const light = MaresiPalette(
    surface: Color(0xFFFFFFFF),
    text: Color(0xFF333333),
    textSecondary: Color(0xFF6B7280),
    textLight: Color(0xFF999999),
    border: Color(0xFFE0E0E0),
    inputBorder: Color(0xFFD1D5DB),
    pillBg: Color(0xFFF5F5F5),
    navActiveBg: Color(0xFFECFEFF),
    heartInactive: Color(0xFF666666),
    menuBorder: Colors.black,
    sheetShadow: Color(0x40000000),
  );

  static const dark = MaresiPalette(
    surface: Color(0xFF1E1E1E),
    text: Color(0xFFF3F4F6),
    textSecondary: Color(0xFF9CA3AF),
    textLight: Color(0xFF6B7280),
    border: Color(0xFF374151),
    inputBorder: Color(0xFF4B5563),
    pillBg: Color(0xFF2D2D2D),
    navActiveBg: Color(0xFF134E4A),
    heartInactive: Color(0xFF9CA3AF),
    menuBorder: Color(0xFF4B5563),
    sheetShadow: Color(0x66000000),
  );

  @override
  MaresiPalette copyWith({
    Color? surface,
    Color? text,
    Color? textSecondary,
    Color? textLight,
    Color? border,
    Color? inputBorder,
    Color? pillBg,
    Color? navActiveBg,
    Color? heartInactive,
    Color? menuBorder,
    Color? sheetShadow,
  }) {
    return MaresiPalette(
      surface: surface ?? this.surface,
      text: text ?? this.text,
      textSecondary: textSecondary ?? this.textSecondary,
      textLight: textLight ?? this.textLight,
      border: border ?? this.border,
      inputBorder: inputBorder ?? this.inputBorder,
      pillBg: pillBg ?? this.pillBg,
      navActiveBg: navActiveBg ?? this.navActiveBg,
      heartInactive: heartInactive ?? this.heartInactive,
      menuBorder: menuBorder ?? this.menuBorder,
      sheetShadow: sheetShadow ?? this.sheetShadow,
    );
  }

  @override
  MaresiPalette lerp(ThemeExtension<MaresiPalette>? other, double t) {
    if (other is! MaresiPalette) return this;
    return MaresiPalette(
      surface: Color.lerp(surface, other.surface, t)!,
      text: Color.lerp(text, other.text, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textLight: Color.lerp(textLight, other.textLight, t)!,
      border: Color.lerp(border, other.border, t)!,
      inputBorder: Color.lerp(inputBorder, other.inputBorder, t)!,
      pillBg: Color.lerp(pillBg, other.pillBg, t)!,
      navActiveBg: Color.lerp(navActiveBg, other.navActiveBg, t)!,
      heartInactive: Color.lerp(heartInactive, other.heartInactive, t)!,
      menuBorder: Color.lerp(menuBorder, other.menuBorder, t)!,
      sheetShadow: Color.lerp(sheetShadow, other.sheetShadow, t)!,
    );
  }
}

extension MaresiPaletteContext on BuildContext {
  MaresiPalette get palette => Theme.of(this).extension<MaresiPalette>()!;
}
