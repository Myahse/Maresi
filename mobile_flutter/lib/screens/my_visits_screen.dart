import 'package:flutter/material.dart';
import 'package:maresi_mobile/models/visit_request.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/screens/stay_agreement_screen.dart';
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
  String? _actingId;
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

  Future<void> _openLink(String url) async {
    final uri = Uri.parse(url);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  bool _canCancel(String status) =>
      status == 'pending' ||
      status == 'awaiting_agreement' ||
      status == 'awaiting_key' ||
      status == 'awaiting_payment' ||
      status == 'payment_sent' ||
      status == 'confirmed';

  Future<void> _cancelStay(VisitRequest visit) async {
    final locale = context.read<LocaleProvider>();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(locale.t('visits.cancelCta')),
        content: Text(locale.t('visits.cancelConfirm')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(locale.t('common.cancel'))),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text(locale.t('visits.cancelCta'))),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _actingId = visit.id);
    try {
      await maresiApi.updateVisitRequestStatus(visit.id, 'cancelled');
      if (!mounted) return;
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _actingId = null);
    }
  }

  Future<void> _markPaid(VisitRequest visit) async {
    setState(() => _actingId = visit.id);
    try {
      await maresiApi.updateVisitRequestStatus(visit.id, 'payment_sent');
      if (!mounted) return;
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _actingId = null);
    }
  }

  Future<void> _signAgreement(VisitRequest visit) async {
    final signed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => StayAgreementScreen(visit: visit)),
    );
    if (signed == true && mounted) await _load();
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
                                if (visit.status == 'awaiting_agreement') ...[
                                  const SizedBox(height: 8),
                                  Text(locale.t('visits.agreementBody'), style: TextStyle(color: palette.textSecondary, fontSize: 13)),
                                  const SizedBox(height: 12),
                                  FilledButton(
                                    onPressed: _actingId == visit.id ? null : () => _signAgreement(visit),
                                    style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                                    child: Text(locale.t('visits.agreementSign')),
                                  ),
                                ],
                                if (visit.status == 'awaiting_key') ...[
                                  const SizedBox(height: 8),
                                  Text(locale.t('visits.keyHint'), style: TextStyle(color: palette.textSecondary, fontSize: 13)),
                                  const SizedBox(height: 8),
                                  Text(
                                    visit.keyCode ?? '------',
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: 8),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(locale.t('visits.keyWaitingHost'), style: TextStyle(color: palette.textSecondary, fontSize: 12)),
                                ],
                                if (visit.status == 'awaiting_payment') ...[
                                  const SizedBox(height: 8),
                                  Text(locale.t('payments.payHostHint'), style: TextStyle(color: palette.textSecondary, fontSize: 13)),
                                  if (visit.wavePaymentUrl != null && visit.wavePaymentUrl!.isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    FilledButton(
                                      onPressed: () => _openLink(visit.wavePaymentUrl!),
                                      style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                                      child: Text(locale.t('payments.payWave')),
                                    ),
                                  ],
                                  if (visit.orangeMoneyUrl != null && visit.orangeMoneyUrl!.isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    OutlinedButton(
                                      onPressed: () => _openLink(visit.orangeMoneyUrl!),
                                      child: Text(locale.t('payments.payOrange')),
                                    ),
                                  ],
                                  const SizedBox(height: 12),
                                  FilledButton(
                                    onPressed: _actingId == visit.id ? null : () => _markPaid(visit),
                                    style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                                    child: Text(
                                      _actingId == visit.id
                                          ? locale.t('payments.paying')
                                          : locale.t('payments.iPaidHost'),
                                    ),
                                  ),
                                ],
                                if (_canCancel(visit.status)) ...[
                                  if (visit.status == 'confirmed' || visit.status == 'payment_sent') ...[
                                    const SizedBox(height: 8),
                                    Text(locale.t('visits.cancelPaidHint'), style: TextStyle(color: palette.textSecondary, fontSize: 12)),
                                  ],
                                  const SizedBox(height: 8),
                                  OutlinedButton(
                                    onPressed: _actingId == visit.id ? null : () => _cancelStay(visit),
                                    child: Text(
                                      _actingId == visit.id
                                          ? locale.t('payments.paying')
                                          : locale.t('visits.cancelCta'),
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
