import 'package:flutter/material.dart';
import 'package:maresi_mobile/models/visit_request.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/services/maresi_client.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

class MyVisitsScreen extends StatefulWidget {
  const MyVisitsScreen({super.key});

  @override
  State<MyVisitsScreen> createState() => _MyVisitsScreenState();
}

class _MyVisitsScreenState extends State<MyVisitsScreen> {
  List<VisitRequest> _visits = [];
  bool _loading = true;
  String? _payingId;
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
      final visits = await maresiApi.listMyVisitRequests();
      if (!mounted) return;
      setState(() {
        _visits = visits;
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

  Future<void> _pay(VisitRequest visit) async {
    setState(() => _payingId = visit.id);
    try {
      final payment = await maresiApi.startReservationPayment(visit.id);
      if (!mounted) return;
      if (payment.checkoutUrl != null && payment.checkoutUrl!.isNotEmpty) {
        final uri = Uri.parse(payment.checkoutUrl!);
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.read<LocaleProvider>().t('payments.successSnack'))),
        );
        await _load();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _payingId = null);
    }
  }

  String _statusLabel(LocaleProvider locale, String status) {
    final key = 'visits.status.$status';
    final value = locale.t(key);
    return value == key ? status : value;
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final palette = context.palette;

    return Scaffold(
      backgroundColor: palette.surface,
      appBar: AppBar(
        backgroundColor: palette.surface,
        surfaceTintColor: Colors.transparent,
        title: Text(locale.t('visits.title')),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: AppColors.error)))
              : _visits.isEmpty
                  ? Center(child: Text(locale.t('visits.empty'), style: TextStyle(color: palette.textSecondary)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _visits.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final visit = _visits[index];
                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFE5E7EB)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Text(
                                  visit.propertyTitle ?? locale.t('nav.property'),
                                  style: TextStyle(fontWeight: FontWeight.w700, color: palette.text),
                                ),
                                if (visit.location != null) ...[
                                  const SizedBox(height: 4),
                                  Text(visit.location!, style: TextStyle(color: palette.textSecondary, fontSize: 13)),
                                ],
                                const SizedBox(height: 8),
                                Text(
                                  _statusLabel(locale, visit.status),
                                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600),
                                ),
                                if (visit.status == 'awaiting_payment') ...[
                                  const SizedBox(height: 12),
                                  FilledButton(
                                    onPressed: _payingId == visit.id ? null : () => _pay(visit),
                                    style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                                    child: Text(
                                      _payingId == visit.id
                                          ? locale.t('payments.paying')
                                          : locale.t('payments.payReservation'),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
