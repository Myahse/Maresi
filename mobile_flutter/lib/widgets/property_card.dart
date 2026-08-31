import 'package:intl/intl.dart';
import 'package:maresi_mobile/models/property.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:flutter/material.dart';

String formatPrice(int price) {
  return '${NumberFormat('#,###', 'fr_FR').format(price)} CFA';
}

/// Immo-style 200×200 card with bottom gradient overlay.
class PropertyCard extends StatelessWidget {
  const PropertyCard({
    super.key,
    required this.property,
    required this.onTap,
    this.onFavoriteTap,
    this.isFavorite = false,
    this.compact = true,
    this.noImageLabel = "Pas d'image",
    this.defaultTitle = 'Bien',
  });

  final Property property;
  final VoidCallback onTap;
  final VoidCallback? onFavoriteTap;
  final bool isFavorite;
  final bool compact;
  final String noImageLabel;
  final String defaultTitle;

  @override
  Widget build(BuildContext context) {
    if (compact) return _buildCompactCard(context);
    return _buildListCard(context);
  }

  Widget _buildCompactCard(BuildContext context) {
    final palette = context.palette;
    final imageUrl = property.images.isNotEmpty ? property.images.first : null;
    final title = property.title.isNotEmpty ? property.title : defaultTitle;

    return Padding(
      padding: const EdgeInsets.only(right: 24),
      child: SizedBox(
        width: 200,
        height: 200,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: onTap,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (imageUrl != null)
                    Image.network(imageUrl, fit: BoxFit.cover, errorBuilder: (context, error, stackTrace) => _placeholder(palette))
                  else
                    _placeholder(palette),
                  if (onFavoriteTap != null)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: GestureDetector(
                        onTap: onFavoriteTap,
                        child: Icon(
                          isFavorite ? Icons.favorite : Icons.favorite_border,
                          color: isFavorite ? AppColors.favorite : palette.heartInactive,
                          size: 22,
                        ),
                      ),
                    ),
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 90,
                    child: ColoredBox(
                      color: const Color(0xB3000000),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _titleWithStar(
                              title,
                              color: Colors.white,
                              fontSize: 14,
                              maxLines: 1,
                            ),
                            if (property.location.isNotEmpty)
                              Row(
                                children: [
                                  const Icon(Icons.location_on, size: 12, color: Colors.white),
                                  const SizedBox(width: 2),
                                  Expanded(
                                    child: Text(
                                      property.location,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(color: Colors.white, fontSize: 11),
                                    ),
                                  ),
                                ],
                              ),
                            Text(
                              formatPrice(property.price),
                              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildListCard(BuildContext context) {
    final palette = context.palette;
    final imageUrl = property.images.isNotEmpty ? property.images.first : null;
    final title = property.title.isNotEmpty ? property.title : defaultTitle;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Material(
        color: palette.surface,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border.all(color: palette.menuBorder),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.horizontal(left: Radius.circular(15)),
                  child: SizedBox(
                    width: 120,
                    height: 112,
                    child: imageUrl != null
                        ? Image.network(imageUrl, fit: BoxFit.cover, errorBuilder: (context, error, stackTrace) => _placeholder(palette))
                        : _placeholder(palette),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: _titleWithStar(
                                title,
                                color: palette.text,
                                fontSize: 15,
                                maxLines: 2,
                              ),
                            ),
                            if (onFavoriteTap != null)
                              GestureDetector(
                                onTap: onFavoriteTap,
                                child: Padding(
                                  padding: const EdgeInsets.only(left: 8),
                                  child: Icon(
                                    isFavorite ? Icons.favorite : Icons.favorite_border,
                                    color: isFavorite ? AppColors.favorite : palette.heartInactive,
                                    size: 22,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        if (property.location.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(Icons.location_on_outlined, size: 14, color: palette.textSecondary),
                              const SizedBox(width: 2),
                              Expanded(
                                child: Text(
                                  property.location,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(fontSize: 13, color: palette.textSecondary),
                                ),
                              ),
                            ],
                          ),
                        ],
                        const SizedBox(height: 8),
                        Text(
                          formatPrice(property.price),
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _titleWithStar(String title, {required Color color, required double fontSize, int maxLines = 1}) {
    final rating = property.averageRating;
    final count = property.ratingCount ?? 0;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(Icons.star, size: fontSize, color: Colors.amber),
        const SizedBox(width: 2),
        Text(
          count > 0 && rating != null ? rating.toStringAsFixed(1) : '—',
          style: TextStyle(color: color, fontSize: fontSize, fontWeight: FontWeight.w700),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            title,
            maxLines: maxLines,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: color, fontSize: fontSize, fontWeight: FontWeight.w700, height: 1.25),
          ),
        ),
      ],
    );
  }

  Widget _placeholder(MaresiPalette palette) {
    return ColoredBox(
      color: palette.pillBg,
      child: Center(child: Text(noImageLabel, style: TextStyle(color: palette.textLight, fontSize: 12))),
    );
  }
}
