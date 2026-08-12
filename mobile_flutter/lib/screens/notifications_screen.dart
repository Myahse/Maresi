import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:maresi_mobile/models/app_notification.dart';
import 'package:maresi_mobile/models/property.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/services/maresi_client.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:maresi_mobile/widgets/immo_widgets.dart';
import 'package:provider/provider.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key, this.onOpenProperty});

  final ValueChanged<Property>? onOpenProperty;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<AppNotification> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final locale = context.read<LocaleProvider>();
    try {
      final data = await maresiApi.listNotifications();
      if (!mounted) return;
      setState(() {
        _items = data;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = locale.t('notifications.loadFailed');
        _items = [];
        _loading = false;
      });
    }
  }

  Future<void> _markRead(String id) async {
    setState(() {
      _items = _items.map((n) => n.id == id ? n.copyWith(read: true) : n).toList();
    });
    try {
      await maresiApi.markNotificationRead(id);
    } catch (_) {
      if (mounted) _load();
    }
  }

  Future<void> _markAllRead() async {
    setState(() {
      _items = _items.map((n) => n.copyWith(read: true)).toList();
    });
    try {
      await maresiApi.markAllNotificationsRead();
    } catch (_) {
      if (mounted) _load();
    }
  }

  Future<void> _openNotification(AppNotification notification) async {
    if (!notification.read) await _markRead(notification.id);
    final propertyId = notification.propertyId;
    if (propertyId == null || widget.onOpenProperty == null) return;

    try {
      final property = await maresiApi.getProperty(propertyId);
      if (!mounted) return;
      widget.onOpenProperty!(property);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.read<LocaleProvider>().t('notifications.openFailed'))),
      );
    }
  }

  String _formatTime(LocaleProvider locale, DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);
    if (diff.inMinutes < 60) {
      return locale.t('notifications.minutesAgo').replaceAll('{{count}}', '${diff.inMinutes.clamp(1, 59)}');
    }
    if (diff.inHours < 24) {
      return locale.t('notifications.hoursAgo').replaceAll('{{count}}', '${diff.inHours}');
    }
    if (diff.inDays < 7) {
      return locale.t('notifications.daysAgo').replaceAll('{{count}}', '${diff.inDays}');
    }
    return DateFormat.yMMMd(locale.locale).format(time);
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final palette = context.palette;
    final unread = _items.where((n) => !n.read).length;

    return Scaffold(
      backgroundColor: palette.surface,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: Icon(Icons.arrow_back, color: palette.text),
                  ),
                  Expanded(
                    child: Text(
                      locale.t('notifications.title'),
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: palette.text),
                    ),
                  ),
                  if (unread > 0)
                    TextButton(
                      onPressed: _markAllRead,
                      child: Text(locale.t('notifications.markAllRead'), style: const TextStyle(color: AppColors.primary, fontSize: 13)),
                    ),
                ],
              ),
            ),
            if (unread > 0)
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
                child: Text(
                  locale.t('notifications.unreadCount').replaceAll('{{count}}', '$unread'),
                  style: TextStyle(color: palette.textSecondary, fontSize: 13),
                ),
              ),
            Expanded(child: _buildBody(locale, palette)),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(LocaleProvider locale, MaresiPalette palette) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!, style: const TextStyle(color: AppColors.error)),
            const SizedBox(height: 12),
            ImmoGradientButton(label: locale.t('common.retry'), onPressed: _load, width: 200),
          ],
        ),
      );
    }
    if (_items.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.notifications_none, size: 48, color: palette.textLight),
              const SizedBox(height: 12),
              Text(
                locale.t('notifications.empty'),
                textAlign: TextAlign.center,
                style: TextStyle(color: palette.textSecondary, fontSize: 16),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: _load,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
        itemCount: _items.length,
        separatorBuilder: (context, index) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final item = _items[index];
          return _NotificationTile(
            title: item.title,
            message: item.message,
            time: _formatTime(locale, item.createdAt),
            read: item.read,
            icon: item.icon,
            onTap: () => _openNotification(item),
          );
        },
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.title,
    required this.message,
    required this.time,
    required this.read,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String message;
  final String time;
  final bool read;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: read ? palette.surface : palette.navActiveBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: read ? palette.border : AppColors.primary.withValues(alpha: 0.2)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 20, color: AppColors.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: palette.text),
                        ),
                      ),
                      if (!read)
                        Container(
                          width: 8,
                          height: 8,
                          margin: const EdgeInsets.only(left: 8),
                          decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(message, style: TextStyle(fontSize: 13, height: 1.35, color: palette.textSecondary)),
                  const SizedBox(height: 6),
                  Text(time, style: TextStyle(fontSize: 12, color: palette.textLight)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
