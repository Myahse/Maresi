import 'package:flutter/material.dart';

/// White card shell — matches maresi/web `card.tsx` (rounded-lg, shadow-sm).
class MaresiCard extends StatelessWidget {
  const MaresiCard({super.key, required this.child, this.padding = const EdgeInsets.all(24)});

  final Widget child;
  final EdgeInsets padding;

  static const _border = Color(0xFFE5E5E5);

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _border),
        boxShadow: const [
          BoxShadow(color: Color(0x0D000000), blurRadius: 2, offset: Offset(0, 1)),
        ],
      ),
      child: Padding(padding: padding, child: child),
    );
  }
}

class MaresiSectionHeader extends StatelessWidget {
  const MaresiSectionHeader({super.key, required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Color(0xFF111827),
            height: 1.3,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(
            subtitle!,
            style: const TextStyle(fontSize: 14, color: Color(0xFF4B5563), height: 1.4),
          ),
        ],
      ],
    );
  }
}
