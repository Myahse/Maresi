import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:maresi_mobile/config/app_config.dart';
import 'package:maresi_mobile/models/property.dart';
import 'package:maresi_mobile/models/property_types.dart';
import 'package:maresi_mobile/providers/auth_provider.dart';
import 'package:maresi_mobile/providers/favorites_provider.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/screens/login_screen.dart';
import 'package:maresi_mobile/screens/reservation_flow_screen.dart';
import 'package:maresi_mobile/services/maresi_client.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:maresi_mobile/widgets/immo_widgets.dart';
import 'package:maresi_mobile/utils/property_amenities.dart';
import 'package:maresi_mobile/widgets/property_card.dart';
import 'package:maresi_mobile/widgets/property_detail_section.dart';
import 'package:maresi_mobile/widgets/property_photo_viewer.dart';
import 'package:maresi_mobile/widgets/property_ratings_section.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

class PropertyDetailsScreen extends StatefulWidget {
  const PropertyDetailsScreen({super.key, required this.propertyId, this.initialProperty});

  final String propertyId;
  final Property? initialProperty;

  @override
  State<PropertyDetailsScreen> createState() => _PropertyDetailsScreenState();
}

class _PropertyDetailsScreenState extends State<PropertyDetailsScreen> {
  Property? _property;
  bool _loading = false;
  String? _error;
  int _activeImageIndex = 0;
  late final PageController _imagePageController = PageController();

  @override
  void dispose() {
    _imagePageController.dispose();
    super.dispose();
  }

  String _propertyTypeLabel(LocaleProvider locale, String type) => switch (PropertyTypes.canonical(type)) {
        PropertyTypes.villa => locale.t('register.typeVilla'),
        PropertyTypes.apartment => locale.t('register.typeApartment'),
        PropertyTypes.studio => locale.t('register.typeStudio'),
        PropertyTypes.hotel => locale.t('register.typeHotel'),
        _ => type,
      };

  @override
  void initState() {
    super.initState();
    _property = widget.initialProperty;
    if (_property == null) _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final locale = context.read<LocaleProvider>();
    try {
      final data = await maresiApi.getProperty(widget.propertyId);
      if (!mounted) return;
      setState(() {
        _property = data;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = locale.t('details.loadFailed');
        _loading = false;
      });
    }
  }

  Future<void> _shareListing(Property property) async {
    final url = AppConfig.listingPageUrl(property.id);
    final text = '${property.title}\n$url';
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    final message = context.read<LocaleProvider>().t('details.linkCopied');
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _launch(Uri uri) async {
    if (!await launchUrl(uri) && mounted) {
      final message = context.read<LocaleProvider>().t('details.linkFailed');
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    }
  }

  Future<void> _startReservation(Property property) async {
    if (!context.read<AuthProvider>().isAuthenticated) {
      final loggedIn = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => const LoginScreen(popOnSuccess: true)),
      );
      if (!mounted || loggedIn != true) return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ReservationFlowScreen(property: property)),
    );
  }

  void _openPhotoViewer(List<String> images, int index, String noImageLabel) {
    PropertyPhotoViewer.open(
      context,
      images: images,
      initialIndex: index,
      noImageLabel: noImageLabel,
    );
  }

  void _onRatingStatsUpdated(double average, int count) {
    final current = _property;
    if (current == null) return;
    setState(() {
      _property = current.copyWith(averageRating: average, ratingCount: count);
    });
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final favorites = context.watch<FavoritesProvider>();
    final palette = context.palette;
    final property = _property;
    final topPadding = MediaQuery.paddingOf(context).top;

    if (_loading && property == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    }
    if (_error != null && property == null) {
      return Scaffold(
        appBar: AppBar(title: Text(locale.t('nav.property'))),
        body: Center(child: Text(_error!, style: const TextStyle(color: AppColors.error))),
      );
    }
    if (property == null) return const SizedBox.shrink();

    final images = property.images.isNotEmpty ? property.images : <String>[];
    final isFavorite = favorites.isFavorite(property.id);
    final amenities = resolvePropertyAmenities(property);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        bottomNavigationBar: ColoredBox(
          color: palette.surface,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 12),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: palette.text,
                        side: BorderSide(color: palette.menuBorder),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        backgroundColor: palette.surface,
                      ),
                      onPressed: property.ownerPhone != null ? () => _launch(Uri(scheme: 'tel', path: property.ownerPhone)) : null,
                      child: Text(locale.t('details.call')),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ImmoGradientButton(
                      label: locale.t('details.reserve'),
                      width: double.infinity,
                      onPressed: () => _startReservation(property),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        body: SingleChildScrollView(
          child: Column(
            children: [
                  SizedBox(
                    height: images.length > 1 ? 320 : 280,
                    width: double.infinity,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        if (images.isNotEmpty)
                          PageView.builder(
                            controller: _imagePageController,
                            itemCount: images.length,
                            onPageChanged: (index) => setState(() => _activeImageIndex = index),
                            itemBuilder: (context, index) => GestureDetector(
                              onTap: () => _openPhotoViewer(images, index, locale.t('details.noImage')),
                              child: Image.network(
                                images[index],
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) => ColoredBox(
                                  color: palette.pillBg,
                                  child: Center(child: Text(locale.t('details.noImage'), style: TextStyle(color: palette.textSecondary))),
                                ),
                              ),
                            ),
                          )
                        else
                          ColoredBox(
                            color: palette.pillBg,
                            child: Center(child: Text(locale.t('details.noImage'), style: TextStyle(color: palette.textSecondary))),
                          ),
                        Positioned(
                          top: topPadding + 8,
                          left: 16,
                          child: _CircleIconButton(icon: Icons.arrow_back, onTap: () => Navigator.pop(context)),
                        ),
                        Positioned(
                          top: topPadding + 8,
                          right: 16,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _CircleIconButton(
                                icon: Icons.ios_share,
                                onTap: () => _shareListing(property),
                              ),
                              const SizedBox(width: 8),
                              _CircleIconButton(
                                icon: isFavorite ? Icons.favorite : Icons.favorite_border,
                                iconColor: isFavorite ? AppColors.favorite : palette.text,
                                onTap: () => favorites.toggle(property),
                              ),
                            ],
                          ),
                        ),
                        if (images.length > 1)
                          Positioned(
                            left: 0,
                            right: 0,
                            bottom: 36,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: List.generate(
                                images.length,
                                (index) => Container(
                                  width: index == _activeImageIndex ? 18 : 6,
                                  height: 6,
                                  margin: const EdgeInsets.symmetric(horizontal: 3),
                                  decoration: BoxDecoration(
                                    color: index == _activeImageIndex ? Colors.white : Colors.white.withValues(alpha: 0.5),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        if (images.length > 1)
                          Positioned(
                            left: 16,
                            right: 16,
                            bottom: 8,
                            child: SizedBox(
                              height: 56,
                              child: ListView.separated(
                                scrollDirection: Axis.horizontal,
                                itemCount: images.length,
                                separatorBuilder: (_, __) => const SizedBox(width: 8),
                                itemBuilder: (context, index) {
                                  final selected = index == _activeImageIndex;
                                  return GestureDetector(
                                    onTap: () => _openPhotoViewer(images, index, locale.t('details.noImage')),
                                    child: DecoratedBox(
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                          color: selected ? Colors.white : Colors.white.withValues(alpha: 0.4),
                                          width: selected ? 2 : 1,
                                        ),
                                      ),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: Image.network(images[index], width: 72, height: 56, fit: BoxFit.cover),
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  Transform.translate(
                    offset: const Offset(0, -28),
                    child: ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                      child: ColoredBox(
                        color: palette.surface,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            DecoratedBox(
                              decoration: const BoxDecoration(color: AppColors.primary),
                              child: Padding(
                                padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      alignment: Alignment.center,
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        (property.ownerName ?? 'M').substring(0, 1).toUpperCase(),
                                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 18),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            property.ownerName ?? 'Maresi',
                                            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
                                          ),
                                          Text(
                                            property.propertyType.toUpperCase(),
                                            style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            Transform.translate(
                              offset: const Offset(0, -16),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: palette.surface,
                                  borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                                  boxShadow: [
                                    BoxShadow(color: palette.sheetShadow, blurRadius: 12, offset: const Offset(0, -2)),
                                  ],
                                ),
                                padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Icon(Icons.star, color: Colors.amber, size: 22),
                                        const SizedBox(width: 4),
                                        Text(
                                          (property.ratingCount ?? 0) > 0 && property.averageRating != null
                                              ? property.averageRating!.toStringAsFixed(1)
                                              : '—',
                                          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: palette.text),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            property.title,
                                            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: palette.text),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      formatPrice(property.price),
                                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.primary),
                                    ),
                                    if (property.location.isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          Icon(Icons.location_on_outlined, size: 18, color: palette.textSecondary),
                                          const SizedBox(width: 4),
                                          Expanded(child: Text(property.location, style: TextStyle(color: palette.textSecondary))),
                                        ],
                                      ),
                                    ],
                                    const SizedBox(height: 20),
                                    if (images.isNotEmpty)
                                      PropertyDetailSection(
                                        title: locale.t('details.photos'),
                                        subtitle: images.length > 1 ? locale.t('details.photosHint') : null,
                                        child: SizedBox(
                                          height: 96,
                                          child: ListView.separated(
                                            scrollDirection: Axis.horizontal,
                                            itemCount: images.length,
                                            separatorBuilder: (_, __) => const SizedBox(width: 10),
                                            itemBuilder: (context, index) {
                                              final selected = index == _activeImageIndex;
                                              return GestureDetector(
                                                onTap: () => _openPhotoViewer(images, index, locale.t('details.noImage')),
                                                child: DecoratedBox(
                                                  decoration: BoxDecoration(
                                                    borderRadius: BorderRadius.circular(12),
                                                    border: Border.all(
                                                      color: selected ? AppColors.primary : palette.menuBorder,
                                                      width: selected ? 2 : 1,
                                                    ),
                                                  ),
                                                  child: ClipRRect(
                                                    borderRadius: BorderRadius.circular(10),
                                                    child: Image.network(
                                                      images[index],
                                                      width: 128,
                                                      height: 96,
                                                      fit: BoxFit.cover,
                                                      errorBuilder: (context, error, stackTrace) => ColoredBox(
                                                        color: palette.pillBg,
                                                        child: Center(
                                                          child: Text(locale.t('details.noImage'), style: TextStyle(fontSize: 11, color: palette.textSecondary)),
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                                ),
                                              );
                                            },
                                          ),
                                        ),
                                      ),
                                    PropertyDetailSection(
                                      title: locale.t('details.about'),
                                      child: Text(
                                        property.description.isNotEmpty ? property.description : locale.t('details.noDescription'),
                                        style: TextStyle(fontSize: 15, height: 1.55, color: palette.text),
                                      ),
                                    ),
                                    PropertyDetailSection(
                                      title: locale.t('details.amenities'),
                                      subtitle: locale.t('details.amenitiesHint'),
                                      child: Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: amenities.map((id) {
                                          return Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                            decoration: BoxDecoration(
                                              color: palette.pillBg,
                                              borderRadius: BorderRadius.circular(999),
                                              border: Border.all(color: palette.menuBorder),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(amenityIcon(id), size: 16, color: AppColors.primary),
                                                const SizedBox(width: 6),
                                                Text(
                                                  locale.t(amenityLabelKey(id)),
                                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: palette.text),
                                                ),
                                              ],
                                            ),
                                          );
                                        }).toList(),
                                      ),
                                    ),
                                    PropertyDetailSection(
                                      title: locale.t('details.info'),
                                      child: Column(
                                        children: [
                                          _InfoRow(
                                            icon: Icons.home_work_outlined,
                                            label: locale.t('details.type'),
                                            value: _propertyTypeLabel(locale, property.propertyType),
                                            palette: palette,
                                          ),
                                          if (property.bedrooms != null)
                                            _InfoRow(
                                              icon: Icons.bed_outlined,
                                              label: locale.t('details.bedrooms'),
                                              value: '${property.bedrooms}',
                                              palette: palette,
                                            ),
                                          if (property.maxGuests != null)
                                            _InfoRow(
                                              icon: Icons.people_outline,
                                              label: locale.t('details.maxGuests'),
                                              value: '${property.maxGuests}',
                                              palette: palette,
                                            ),
                                          if (property.averageRating != null)
                                            _InfoRow(
                                              icon: Icons.star_outline,
                                              label: locale.t('details.rating'),
                                              value: property.ratingCount != null
                                                  ? '${property.averageRating!.toStringAsFixed(1)} (${property.ratingCount})'
                                                  : property.averageRating!.toStringAsFixed(1),
                                              palette: palette,
                                            ),
                                        ],
                                      ),
                                    ),
                                    PropertyRatingsSection(
                                      propertyId: property.id,
                                      initialAverage: property.averageRating,
                                      initialCount: property.ratingCount,
                                      onStatsUpdated: _onRatingStatsUpdated,
                                    ),
                                    if (property.ownerEmail != null || property.ownerPhone != null)
                                      PropertyDetailSection(
                                        title: locale.t('details.contactOwner'),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            if (property.ownerEmail != null)
                                              InkWell(
                                                onTap: () => _launch(Uri(scheme: 'mailto', path: property.ownerEmail)),
                                                child: Padding(
                                                  padding: const EdgeInsets.symmetric(vertical: 6),
                                                  child: Row(
                                                    children: [
                                                      const Icon(Icons.mail_outline, size: 18, color: AppColors.accent),
                                                      const SizedBox(width: 8),
                                                      Expanded(child: Text(property.ownerEmail!, style: const TextStyle(color: AppColors.accent))),
                                                    ],
                                                  ),
                                                ),
                                              ),
                                            if (property.ownerPhone != null)
                                              InkWell(
                                                onTap: () => _launch(Uri(scheme: 'tel', path: property.ownerPhone)),
                                                child: Padding(
                                                  padding: const EdgeInsets.symmetric(vertical: 6),
                                                  child: Row(
                                                    children: [
                                                      const Icon(Icons.phone_outlined, size: 18, color: AppColors.accent),
                                                      const SizedBox(width: 8),
                                                      Expanded(child: Text(property.ownerPhone!, style: const TextStyle(color: AppColors.accent))),
                                                    ],
                                                  ),
                                                ),
                                              ),
                                          ],
                                        ),
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
                ],
              ),
            ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label, required this.value, required this.palette});

  final IconData icon;
  final String label;
  final String value;
  final MaresiPalette palette;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.primary),
          const SizedBox(width: 10),
          Expanded(child: Text(label, style: TextStyle(fontSize: 14, color: palette.textSecondary))),
          Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: palette.text)),
        ],
      ),
    );
  }
}

class _CircleIconButton extends StatelessWidget {
  const _CircleIconButton({required this.icon, required this.onTap, this.iconColor = AppColors.text});

  final IconData icon;
  final VoidCallback onTap;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.9),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(width: 36, height: 36, child: Icon(icon, size: 20, color: iconColor)),
      ),
    );
  }
}
