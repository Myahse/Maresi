import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:maresi_mobile/models/property.dart';
import 'package:maresi_mobile/screens/property_create_screen.dart';
import 'package:maresi_mobile/providers/auth_provider.dart';
import 'package:maresi_mobile/providers/favorites_provider.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/providers/location_provider.dart';
import 'package:maresi_mobile/services/maresi_client.dart';
import 'package:geolocator/geolocator.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:maresi_mobile/screens/notifications_screen.dart';
import 'package:maresi_mobile/widgets/immo_widgets.dart';
import 'package:maresi_mobile/widgets/property_card.dart';
import 'package:provider/provider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.onOpenProperty});

  final ValueChanged<Property> onOpenProperty;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Property> _list = [];
  bool _loading = true;
  String? _error;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _load();
      _askLocation();
      context.read<FavoritesProvider>().load();
    });
  }

  Future<void> _askLocation() async {
    final location = context.read<LocationProvider>();
    if (location.status == LocationStatus.granted || location.status == LocationStatus.loading) return;

    final locale = context.read<LocaleProvider>();
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.deniedForever) {
      if (!mounted) return;
      setState(() {});
      return;
    }
    if (permission == LocationPermission.denied) {
      if (!mounted) return;
      final allow = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(locale.t('home.locationPermissionTitle')),
          content: Text(locale.t('home.locationPermissionMessage')),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(locale.t('common.cancel'))),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(locale.t('home.locationAllow'))),
          ],
        ),
      );
      if (allow != true) return;
    }
    if (!mounted) return;
    final ok = await location.requestLocation();
    if (ok && mounted) _load();
  }

  Future<void> _onLocationTap() async {
    final location = context.read<LocationProvider>();
    if (location.status == LocationStatus.denied || location.status == LocationStatus.serviceDisabled) {
      await location.openSettings();
      if (!mounted) return;
      await location.requestLocation();
    } else if (location.status != LocationStatus.loading) {
      await _askLocation();
    }
    if (mounted) _load();
  }

  String _locationLabel(LocaleProvider locale, LocationProvider location) {
    return switch (location.status) {
      LocationStatus.loading => locale.t('home.locationLoading'),
      LocationStatus.granted => location.label ?? locale.t('home.locationHint'),
      LocationStatus.denied => locale.t('home.locationDenied'),
      LocationStatus.serviceDisabled => locale.t('home.locationServiceOff'),
      LocationStatus.idle => locale.t('home.locationHint'),
    };
  }

  Future<void> _load({String? query}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final locale = context.read<LocaleProvider>();
    final locationProvider = context.read<LocationProvider>();
    final searchQuery = query?.trim();
    String? filterLocation;
    if (searchQuery != null && searchQuery.isNotEmpty) {
      filterLocation = searchQuery;
    } else if (locationProvider.hasLocation) {
      filterLocation = locationProvider.label;
    }
    try {
      final data = await maresiApi.listProperties(
        location: filterLocation,
      );
      if (!mounted) return;
      setState(() {
        _list = data;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = locale.t('home.loadFailed');
        _list = [];
        _loading = false;
      });
    }
  }

  Future<void> _openCreateListing() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(builder: (_) => const PropertyCreateScreen()),
    );
    if (created == true && mounted) _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final favorites = context.watch<FavoritesProvider>();
    final location = context.watch<LocationProvider>();
    final auth = context.watch<AuthProvider>();
    final userName = auth.user?.fullName.isNotEmpty == true
        ? auth.user!.fullName
        : auth.user?.phone ?? locale.t('common.user');
    final palette = context.palette;
    final safeTop = MediaQuery.paddingOf(context).top;
    const headerBodyHeight = 108.0;
    final sheetTop = safeTop + headerBodyHeight;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Stack(
        children: [
          Positioned.fill(child: DecoratedBox(decoration: BoxDecoration(color: AppColors.primary))),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 4, 24, 0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          locale.t('home.welcome'),
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 14, fontWeight: FontWeight.w500),
                        ),
                        IconButton(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => NotificationsScreen(onOpenProperty: widget.onOpenProperty),
                              ),
                            );
                          },
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                          icon: const Icon(Icons.notifications_none, color: Colors.white, size: 22),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            userName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: GestureDetector(
                            onTap: _onLocationTap,
                            behavior: HitTestBehavior.opaque,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                if (location.status == LocationStatus.loading)
                                  SizedBox(
                                    width: 14,
                                    height: 14,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white.withValues(alpha: 0.85)),
                                  )
                                else
                                  Icon(Icons.location_on_outlined, size: 16, color: Colors.white.withValues(alpha: 0.85)),
                                const SizedBox(width: 4),
                                Flexible(
                                  child: Text(
                                    _locationLabel(locale, location),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    textAlign: TextAlign.right,
                                    style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13, fontWeight: FontWeight.w500),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            top: sheetTop,
            bottom: 0,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: palette.surface,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
                    child: TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        hintText: locale.t('home.searchHint'),
                        prefixIcon: const Icon(Icons.search, color: AppColors.accent),
                      ),
                      onSubmitted: (value) => _load(query: value),
                    ),
                  ),
                  Expanded(child: _buildBody(locale, favorites)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _horizontalCarousel(LocaleProvider locale, FavoritesProvider favorites) {
    if (_loading && _list.isEmpty) {
      return const SizedBox(
        height: 200,
        child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }
    if (_list.isEmpty) return const SizedBox(height: 200);

    return SizedBox(
      height: 200,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        itemCount: _list.length,
        itemBuilder: (context, index) {
          final property = _list[index];
          return PropertyCard(
            property: property,
            isFavorite: favorites.isFavorite(property.id),
            noImageLabel: locale.t('details.noImage'),
            defaultTitle: locale.t('card.defaultTitle'),
            onFavoriteTap: () => favorites.toggle(property),
            onTap: () => widget.onOpenProperty(property),
          );
        },
      ),
    );
  }

  Widget _buildBody(LocaleProvider locale, FavoritesProvider favorites) {
    final auth = context.read<AuthProvider>();
    if (_error != null && _list.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!, style: const TextStyle(color: AppColors.error)),
            const SizedBox(height: 12),
            ImmoGradientButton(label: locale.t('common.retry'), onPressed: () => _load(), width: 200),
          ],
        ),
      );
    }
    if (!_loading && _list.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                auth.isOwner ? locale.t('home.ownerEmpty') : locale.t('home.empty'),
                textAlign: TextAlign.center,
                style: TextStyle(color: context.palette.textSecondary),
              ),
              if (auth.isOwner) ...[
                const SizedBox(height: 20),
                ImmoGradientButton(
                  label: locale.t('propertyCreate.title'),
                  width: 260,
                  onPressed: _openCreateListing,
                ),
              ],
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        _horizontalCarousel(locale, favorites),
        const SizedBox(height: 12),
        Expanded(
          child: RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () => _load(query: _searchController.text),
            child: _list.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: const [SizedBox(height: 80)],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 80),
                    itemCount: _list.length,
                    itemBuilder: (context, index) {
                      final property = _list[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _ListPropertyTile(
                          property: property,
                          isFavorite: favorites.isFavorite(property.id),
                          onFavorite: () => favorites.toggle(property),
                          onTap: () => widget.onOpenProperty(property),
                        ),
                      );
                    },
                  ),
          ),
        ),
      ],
    );
  }
}

class _ListPropertyTile extends StatelessWidget {
  const _ListPropertyTile({
    required this.property,
    required this.isFavorite,
    required this.onFavorite,
    required this.onTap,
  });

  final Property property;
  final bool isFavorite;
  final VoidCallback onFavorite;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final imageUrl = property.images.isNotEmpty ? property.images.first : null;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: palette.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                width: 72,
                height: 72,
                child: imageUrl != null
                    ? Image.network(imageUrl, fit: BoxFit.cover)
                    : ColoredBox(color: palette.pillBg, child: Icon(Icons.home_work_outlined, color: palette.textLight)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(property.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontWeight: FontWeight.w600, color: palette.text)),
                  Text(property.location, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: palette.textSecondary, fontSize: 13)),
                  Text(formatPrice(property.price), style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
            IconButton(
              icon: Icon(isFavorite ? Icons.favorite : Icons.favorite_border, color: isFavorite ? AppColors.favorite : palette.heartInactive),
              onPressed: onFavorite,
            ),
          ],
        ),
      ),
    );
  }
}
