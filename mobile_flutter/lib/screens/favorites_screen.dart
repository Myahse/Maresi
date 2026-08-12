import 'package:flutter/material.dart';
import 'package:maresi_mobile/models/property.dart';
import 'package:maresi_mobile/providers/favorites_provider.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:maresi_mobile/widgets/property_card.dart';
import 'package:provider/provider.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key, required this.onOpenProperty});

  final ValueChanged<Property> onOpenProperty;

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<FavoritesProvider>().load());
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final favorites = context.watch<FavoritesProvider>();

    final palette = context.palette;

    return Scaffold(
      backgroundColor: palette.surface,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 48, 24, 16),
              child: Text(locale.t('nav.favorites'), style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: palette.text)),
            ),
            Expanded(
              child: favorites.loading && favorites.favorites.isEmpty
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : favorites.favorites.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Text(locale.t('favorites.emptyHint'), textAlign: TextAlign.center, style: TextStyle(color: palette.textSecondary, fontSize: 16)),
                          ),
                        )
                      : RefreshIndicator(
                          color: AppColors.primary,
                          onRefresh: favorites.load,
                          child: ListView.builder(
                            padding: const EdgeInsets.fromLTRB(24, 0, 24, 80),
                            itemCount: favorites.favorites.length,
                            itemBuilder: (context, index) {
                              final property = favorites.favorites[index].toProperty();
                              return PropertyCard(
                                property: property,
                                compact: false,
                                isFavorite: true,
                                noImageLabel: locale.t('details.noImage'),
                                defaultTitle: locale.t('card.defaultTitle'),
                                onFavoriteTap: () => favorites.toggle(property),
                                onTap: () => widget.onOpenProperty(property),
                              );
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
