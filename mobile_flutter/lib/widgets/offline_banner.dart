import 'package:flutter/material.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/services/offline_store.dart';
import 'package:provider/provider.dart';

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    return ListenableBuilder(
      listenable: OfflineStore.instance,
      builder: (context, _) {
        final store = OfflineStore.instance;
        if (store.online && store.pending == 0) return const SizedBox.shrink();
        final text = !store.online
            ? locale.t('offline.banner')
            : locale.t('offline.back').replaceAll('{{count}}', '${store.pending}');
        return Material(
          color: const Color(0xFFFEF3C7),
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                text,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF451A03), fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        );
      },
    );
  }
}
