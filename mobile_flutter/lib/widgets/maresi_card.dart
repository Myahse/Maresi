import 'package:flutter/material.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';

/// Card shell — matches maresi/web `card.tsx`.
class MaresiCard extends StatelessWidget {
  const MaresiCard({super.key, required this.child, this.padding = const EdgeInsets.all(24)});

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: palette.border),
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
    final palette = context.palette;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: palette.text,
            height: 1.3,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(
            subtitle!,
            style: TextStyle(fontSize: 14, color: palette.textSecondary, height: 1.4),
          ),
        ],
      ],
    );
  }
}
