import 'package:flutter/material.dart';
import 'package:maresi_mobile/models/property.dart';
import 'package:maresi_mobile/providers/favorites_provider.dart';
import 'package:maresi_mobile/screens/favorites_screen.dart';
import 'package:maresi_mobile/screens/home_screen.dart';
import 'package:maresi_mobile/screens/profile_screen.dart';
import 'package:maresi_mobile/screens/property_details_screen.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:maresi_mobile/widgets/immo_widgets.dart';
import 'package:provider/provider.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FavoritesProvider>().load();
    });
  }

  void _openProperty(Property property) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PropertyDetailsScreen(propertyId: property.id, initialProperty: property),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeScreen(onOpenProperty: _openProperty),
      FavoritesScreen(onOpenProperty: _openProperty),
      const ProfileScreen(),
    ];

    final palette = context.palette;

    return Scaffold(
      backgroundColor: palette.surface,
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: Material(
        elevation: 0,
        shadowColor: Colors.transparent,
        color: palette.surface,
        child: ImmoBottomNav(
          index: _index,
          onChanged: (i) => setState(() => _index = i),
          items: const [
            ImmoNavItem(icon: Icons.home_outlined, activeIcon: Icons.home, size: 26),
            ImmoNavItem(icon: Icons.favorite_border, activeIcon: Icons.favorite),
            ImmoNavItem(icon: Icons.person_outline, activeIcon: Icons.person),
          ],
        ),
      ),
    );
  }
}
