import 'package:intl/intl.dart';
import 'package:maresi_mobile/models/property.dart';
import 'package:maresi_mobile/models/property_types.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:maresi_mobile/utils/property_amenities.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

String formatPrice(int price) {
  return '${NumberFormat('#,###', 'fr_FR').format(price)} CFA';
}

/// Immo-style card: full-bleed photos, bottom fade, swipe between images.
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

  String _metaLine(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final parts = <String>[_typeLabel(context)];
    if (property.bedrooms != null && property.bedrooms! > 0) {
      parts.add('${property.bedrooms} ${locale.t('details.bedrooms').toLowerCase()}');
    }
    final amenities = resolvePropertyAmenities(property);
    if (amenities.isNotEmpty) {
      parts.add(locale.t(amenityLabelKey(amenities.first)));
    }
    return parts.where((part) => part.isNotEmpty).join(' · ');
  }

  String _typeLabel(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    return switch (PropertyTypes.canonical(property.propertyType)) {
      PropertyTypes.villa => locale.t('register.typeVilla'),
      PropertyTypes.apartment => locale.t('register.typeApartment'),
      PropertyTypes.studio => locale.t('register.typeStudio'),
      PropertyTypes.hotel => locale.t('register.typeHotel'),
      _ => property.propertyType,
    };
  }

  Widget _photoStack({
    required BuildContext context,
    required MaresiPalette palette,
    required LocaleProvider locale,
    required String title,
    required String meta,
    required bool showTypeChip,
  }) {
    return Stack(
      fit: StackFit.expand,
      children: [
        _SwipeableCover(
          images: property.images,
          placeholder: _placeholder(palette),
        ),
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
        if (showTypeChip)
          Positioned(
            top: 8,
            left: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.9),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                _typeLabel(context),
                style: const TextStyle(color: Colors.black87, fontSize: 10, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        if (property.premiumPositioning)
          Positioned(
            top: showTypeChip ? 34 : 8,
            left: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                locale.t('home.premium'),
                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
              ),
            ),
          ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: DecoratedBox(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0x00000000),
                  Color(0x99000000),
                  Color(0xE6000000),
                ],
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 36, 10, 10),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _titleWithStar(
                    title,
                    color: Colors.white,
                    fontSize: compact ? 14 : 16,
                    maxLines: compact ? 1 : 2,
                  ),
                  if (meta.isNotEmpty)
                    Text(
                      meta,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white, fontSize: 11),
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
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: compact ? 13 : 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCompactCard(BuildContext context) {
    final palette = context.palette;
    final locale = context.watch<LocaleProvider>();
    final title = property.title.isNotEmpty ? property.title : defaultTitle;
    final meta = _metaLine(context);

    return Padding(
      padding: const EdgeInsets.only(right: 24),
      child: SizedBox(
        width: 200,
        height: 250,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: onTap,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: _photoStack(
                context: context,
                palette: palette,
                locale: locale,
                title: title,
                meta: meta,
                showTypeChip: true,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildListCard(BuildContext context) {
    final palette = context.palette;
    final locale = context.watch<LocaleProvider>();
    final title = property.title.isNotEmpty ? property.title : defaultTitle;
    final meta = _metaLine(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(
              height: 240,
              width: double.infinity,
              child: _photoStack(
                context: context,
                palette: palette,
                locale: locale,
                title: title,
                meta: meta,
                showTypeChip: true,
              ),
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

class _SwipeableCover extends StatefulWidget {
  const _SwipeableCover({
    required this.images,
    required this.placeholder,
  });

  final List<String> images;
  final Widget placeholder;

  @override
  State<_SwipeableCover> createState() => _SwipeableCoverState();
}

class _SwipeableCoverState extends State<_SwipeableCover> {
  late final PageController _controller = PageController();
  int _index = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.images.isEmpty) return widget.placeholder;
    if (widget.images.length == 1) {
      return Image.network(
        widget.images.first,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
        errorBuilder: (context, error, stackTrace) => widget.placeholder,
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        PageView.builder(
          controller: _controller,
          itemCount: widget.images.length,
          onPageChanged: (index) => setState(() => _index = index),
          itemBuilder: (context, index) {
            return Image.network(
              widget.images[index],
              fit: BoxFit.cover,
              width: double.infinity,
              height: double.infinity,
              errorBuilder: (context, error, stackTrace) => widget.placeholder,
            );
          },
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 118,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(widget.images.length, (index) {
              final active = index == _index;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 2),
                height: 6,
                width: active ? 16 : 6,
                decoration: BoxDecoration(
                  color: active ? Colors.white : Colors.white54,
                  borderRadius: BorderRadius.circular(999),
                ),
              );
            }),
          ),
        ),
      ],
    );
  }
}
