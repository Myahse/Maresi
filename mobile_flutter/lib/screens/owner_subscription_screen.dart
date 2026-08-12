import 'package:flutter/material.dart';
import 'package:maresi_mobile/models/payment.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/services/maresi_client.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

class OwnerSubscriptionScreen extends StatefulWidget {
  const OwnerSubscriptionScreen({super.key});

  @override
  State<OwnerSubscriptionScreen> createState() => _OwnerSubscriptionScreenState();
}

class _OwnerSubscriptionScreenState extends State<OwnerSubscriptionScreen> {
  OwnerSubscription? _sub;
  bool _loading = true;
  bool _paying = false;
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
    try {
      final sub = await maresiApi.getMySubscription();
      if (!mounted) return;
      setState(() {
        _sub = sub;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _pay() async {
    setState(() => _paying = true);
    try {
      final payment = await maresiApi.startSubscriptionPayment();
      if (!mounted) return;
      if (payment.checkoutUrl != null && payment.checkoutUrl!.isNotEmpty) {
        await launchUrl(Uri.parse(payment.checkoutUrl!), mode: LaunchMode.externalApplication);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.read<LocaleProvider>().t('payments.subscriptionActive'))),
        );
        await _load();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final palette = context.palette;
    final sub = _sub;

    return Scaffold(
      backgroundColor: palette.surface,
      appBar: AppBar(
        backgroundColor: palette.surface,
        surfaceTintColor: Colors.transparent,
        title: Text(locale.t('payments.subscriptionTitle')),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : ListView(
              padding: const EdgeInsets.all(24),
              children: [
                Text(locale.t('payments.subscriptionHint'), style: TextStyle(color: palette.textSecondary)),
                const SizedBox(height: 20),
                if (_error != null)
                  Text(_error!, style: const TextStyle(color: AppColors.error))
                else if (sub != null) ...[
                  _row(locale.t('payments.status'), sub.active ? locale.t('payments.active') : locale.t('payments.inactive')),
                  _row(locale.t('payments.price'), '${sub.priceFcfa} FCFA / ${locale.t('payments.month')}'),
                  if (sub.expiresAt != null)
                    _row(locale.t('payments.expires'), '${sub.expiresAt!.day}/${sub.expiresAt!.month}/${sub.expiresAt!.year}'),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _paying || sub.active ? null : _pay,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(
                      _paying
                          ? locale.t('payments.paying')
                          : sub.active
                              ? locale.t('payments.alreadyActive')
                              : locale.t('payments.subscribeCta'),
                    ),
                  ),
                ],
              ],
            ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF6B7280))),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
