import 'package:flutter/material.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';

class PropertyDetailSection extends StatelessWidget {
  const PropertyDetailSection({
    super.key,
    required this.title,
    required this.child,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: palette.text),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(subtitle!, style: TextStyle(fontSize: 13, color: palette.textSecondary, height: 1.35)),
          ],
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}
