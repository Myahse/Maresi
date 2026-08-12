import 'package:flutter/material.dart';
import 'package:maresi_mobile/models/user.dart';
import 'package:maresi_mobile/screens/my_visits_screen.dart';
import 'package:maresi_mobile/screens/owner_subscription_screen.dart';
import 'package:maresi_mobile/screens/property_create_screen.dart';
import 'package:maresi_mobile/providers/auth_provider.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:maresi_mobile/widgets/immo_widgets.dart';
import 'package:provider/provider.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  Future<void> _confirmLogout(BuildContext context, LocaleProvider locale) async {
    final palette = context.palette;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(locale.t('profile.signOutTitle'), style: TextStyle(color: palette.text, fontWeight: FontWeight.w700)),
        content: Text(locale.t('profile.signOutMessage'), style: TextStyle(color: palette.textSecondary)),
        actionsAlignment: MainAxisAlignment.center,
        actions: [
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ImmoGradientButton(
                label: locale.t('common.cancel'),
                width: 220,
                onPressed: () => Navigator.pop(ctx, false),
              ),
              TextButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: Text(locale.t('profile.signOutConfirm'), style: TextStyle(color: palette.text, fontSize: 12)),
              ),
            ],
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      await context.read<AuthProvider>().logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final palette = context.palette;
    final user = context.watch<AuthProvider>().user;
    final roleLabel = user?.role == UserRole.owner
        ? locale.t('profile.roleOwner')
        : locale.t('profile.roleClient');

    return Scaffold(
      backgroundColor: palette.surface,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 48, 24, 80),
          children: [
            Text(locale.t('nav.profile'), style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: palette.text)),
            const SizedBox(height: 24),
            ImmoMenuGroup(
              children: [
                if (user?.role == UserRole.owner) ...[
                  ImmoMenuTile(
                    title: locale.t('payments.subscriptionTitle'),
                    icon: Icons.workspace_premium_outlined,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => const OwnerSubscriptionScreen()),
                      );
                    },
                  ),
                  const ImmoMenuDivider(),
                  ImmoMenuTile(
                    title: locale.t('propertyCreate.title'),
                    icon: Icons.add_home_work_outlined,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => const PropertyCreateScreen()),
                      );
                    },
                  ),
                  const ImmoMenuDivider(),
                ],
                ImmoMenuTile(
                  title: locale.t('visits.title'),
                  icon: Icons.event_available_outlined,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(builder: (_) => const MyVisitsScreen()),
                    );
                  },
                ),
                const ImmoMenuDivider(),
                ImmoMenuTile(title: locale.t('profile.personalInfo'), icon: Icons.person_outline, onTap: () {}),
                const ImmoMenuDivider(),
                ImmoMenuTile(
                  title: locale.t('profile.email'),
                  icon: Icons.mail_outline,
                  trailing: Text(user?.email ?? '—', style: TextStyle(color: palette.textSecondary)),
                ),
                const ImmoMenuDivider(),
                ImmoMenuTile(
                  title: locale.t('profile.role'),
                  icon: Icons.badge_outlined,
                  trailing: Text(roleLabel, style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            ImmoMenuGroup(
              children: [
                ImmoMenuTile(title: locale.t('profile.support'), icon: Icons.support_agent_outlined, onTap: () {}),
                const ImmoMenuDivider(),
                ImmoMenuTile(title: locale.t('profile.legal'), icon: Icons.gavel_outlined, onTap: () {}),
              ],
            ),
            const SizedBox(height: 24),
            Center(
              child: TextButton.icon(
                onPressed: () => _confirmLogout(context, locale),
                icon: Icon(Icons.logout, color: palette.text),
                label: Text(locale.t('profile.logout'), style: TextStyle(color: palette.text)),
              ),
            ),
            const SizedBox(height: 16),
            Center(
              child: Text(
                'Maresi',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, fontStyle: FontStyle.italic, color: AppColors.primary),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
