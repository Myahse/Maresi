import 'package:intl/intl.dart';
import 'package:maresi_mobile/models/property.dart';
import 'package:maresi_mobile/models/property_types.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:maresi_mobile/widgets/favorite_heart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

String formatPrice(int price) {
  return '${NumberFormat('#,###', 'fr_FR').format(price)} CFA';
}

/// Photo card with title and price below, Airbnb-style.
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

  String _headline(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final location = property.location.isNotEmpty ? property.location : defaultTitle;
    return locale.t('card.typeInLocation').replaceAll('{{type}}', _typeLabel(context)).replaceAll('{{location}}', location);
  }

  String _priceLine(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    return locale.t('card.forOneNight').replaceAll('{{price}}', formatPrice(property.price));
  }

  bool get _guestFavorite {
    final rating = property.averageRating ?? 0;
    final count = property.ratingCount ?? 0;
    return property.premiumPositioning || (count > 0 && rating >= 4.8);
  }

  Widget _photo({
    required BuildContext context,
    required MaresiPalette palette,
    required LocaleProvider locale,
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
            child: FavoriteHeart(
              liked: isFavorite,
              onTap: onFavoriteTap!,
              size: 26,
            ),
          ),
        if (_guestFavorite)
          Positioned(
            top: 10,
            left: 10,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(999),
                boxShadow: const [BoxShadow(color: Color(0x22000000), blurRadius: 6)],
              ),
              child: Text(
                locale.t('card.guestFavorite'),
                style: const TextStyle(color: Colors.black87, fontSize: 11, fontWeight: FontWeight.w700),
              ),
            ),
          ),
      ],
    );
  }

  Widget _info(BuildContext context) {
    final palette = context.palette;
    final rating = property.averageRating;
    final count = property.ratingCount ?? 0;
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 8, 2, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _headline(context),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: palette.text, fontSize: compact ? 14 : 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              Expanded(
                child: Text(
                  _priceLine(context),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: palette.textSecondary, fontSize: 13),
                ),
              ),
              Icon(Icons.star, size: 13, color: palette.text),
              const SizedBox(width: 2),
              Text(
                count > 0 && rating != null ? rating.toStringAsFixed(2) : '—',
                style: TextStyle(color: palette.text, fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCompactCard(BuildContext context) {
    final palette = context.palette;
    final locale = context.watch<LocaleProvider>();

    return Padding(
      padding: const EdgeInsets.only(right: 16),
      child: SizedBox(
        width: 200,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: onTap,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: SizedBox(
                    width: 200,
                    height: 250,
                    child: _photo(context: context, palette: palette, locale: locale),
                  ),
                ),
                _info(context),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildListCard(BuildContext context) {
    final palette = context.palette;
    final locale = context.watch<LocaleProvider>();

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: AspectRatio(
                  aspectRatio: 4 / 5,
                  child: _photo(context: context, palette: palette, locale: locale),
                ),
              ),
              _info(context),
            ],
          ),
        ),
      ),
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
          bottom: 10,
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
