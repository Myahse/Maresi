import 'package:flutter/material.dart';
import 'package:maresi_mobile/models/payment.dart';
import 'package:maresi_mobile/models/payment_method.dart';
import 'package:maresi_mobile/models/visit_request.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/screens/stay_agreement_screen.dart';
import 'package:maresi_mobile/services/maresi_client.dart';
import 'package:maresi_mobile/services/offline_store.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:maresi_mobile/widgets/payment_method_logos.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
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
  final Map<String, PaymentPreview?> _previews = {};
  final Map<String, String> _selectedMethods = {};

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
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _maybeShowSecuritySheet();
      });
      for (final v in visits) {
        if (v.status == 'awaiting_payment' && !_previews.containsKey(v.id)) {
          _previews[v.id] = null;
          maresiApi.previewReservationPayment(v.id).then((preview) {
            if (mounted) setState(() => _previews[v.id] = preview);
          }).catchError((_) {});
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = _friendlyError(e);
      });
    }
  }

  bool _canCancel(String status) =>
      status == 'pending' ||
      status == 'awaiting_host_agreement' ||
      status == 'awaiting_key' ||
      status == 'awaiting_payment';

  bool _isPaidStay(String status) => status == 'payment_sent' || status == 'confirmed';

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
        SnackBar(content: Text(_friendlyError(e))),
      );
    } finally {
      if (mounted) setState(() => _actingId = null);
    }
  }

  bool _canRequestExtension(VisitRequest visit) {
    final status = visit.extensionStatus;
    return visit.closedAt == null &&
        (visit.status == 'confirmed' || visit.status == 'payment_sent') &&
        (status == null || status.isEmpty || status == 'declined' || status == 'confirmed');
  }

  DateTime _minExtendDate(VisitRequest visit) {
    final parsed = DateTime.tryParse(visit.checkOut);
    final base = parsed ?? DateTime.now();
    return DateTime(base.year, base.month, base.day).add(const Duration(days: 1));
  }

  String _friendlyError(Object error) {
    if (OfflineStore.instance.isOfflineQueued(error)) {
      return context.read<LocaleProvider>().t('offline.queued');
    }
    return error.toString().replaceFirst('Exception: ', '');
  }

  String _isoDate(DateTime date) {
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '${date.year}-$month-$day';
  }

  Future<void> _pickAndRequestExtension(VisitRequest visit) async {
    final min = _minExtendDate(visit);
    final picked = await showDatePicker(
      context: context,
      initialDate: min,
      firstDate: min,
      lastDate: min.add(const Duration(days: 60)),
    );
    if (picked == null || !mounted) return;
    setState(() => _actingId = visit.id);
    try {
      await maresiApi.requestStayExtension(visit.id, _isoDate(picked));
      if (!mounted) return;
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_friendlyError(e))),
      );
    } finally {
      if (mounted) setState(() => _actingId = null);
    }
  }

  Future<void> _markExtensionPaid(VisitRequest visit) async {
    setState(() => _actingId = visit.id);
    try {
      await maresiApi.markStayExtensionPaid(visit.id);
      if (!mounted) return;
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_friendlyError(e))),
      );
    } finally {
      if (mounted) setState(() => _actingId = null);
    }
  }

  Future<void> _payReservation(VisitRequest visit) async {
    final method = _selectedMethods[visit.id];
    if (method == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.read<LocaleProvider>().t('payments.chooseOperatorFirst'))),
      );
      return;
    }
    setState(() => _actingId = visit.id);
    try {
      final payment = await maresiApi.startReservationPayment(visit.id, method);
      final url = payment.checkoutUrl;
      if (url != null && url.isNotEmpty) {
        await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      }
      if (!mounted) return;
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_friendlyError(e))),
      );
    } finally {
      if (mounted) setState(() => _actingId = null);
    }
  }

  String _securitySeenKey(String visitId) => 'maresi-key-security-$visitId';

  Future<void> _maybeShowSecuritySheet() async {
    final prefs = await SharedPreferences.getInstance();
    VisitRequest? ready;
    for (final visit in _visits) {
      if (visit.status == 'awaiting_key' &&
          (visit.keyCode?.isNotEmpty ?? false) &&
          prefs.getBool(_securitySeenKey(visit.id)) != true) {
        ready = visit;
        break;
      }
    }
    if (ready == null || !mounted) return;
    await _openSecuritySheet(ready.id);
  }

  Future<void> _openSecuritySheet(String visitId) async {
    final locale = context.read<LocaleProvider>();
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      backgroundColor: const Color(0xFFFFFBEB),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Column(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      color: Color(0xFFFDE68A),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.warning_amber_rounded, color: Color(0xFF92400E)),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    locale.t('visits.securityWarning'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.4,
                      color: Color(0xFF92400E),
                    ),
                  ),
                  Text(
                    locale.t('visits.securityTitle'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Color(0xFF451A03)),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                locale.t('visits.securityMessage1'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 15, height: 1.45, color: Color(0xFF451A03)),
              ),
              const SizedBox(height: 12),
              Text(
                locale.t('visits.securityMessage2'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, height: 1.45, color: Color(0xFF451A03)),
              ),
              const SizedBox(height: 12),
              Text(
                locale.t('visits.securityMessage3'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, height: 1.45, color: Color(0xFF78350F)),
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => Navigator.pop(ctx),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFD97706),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                ),
                child: Text(locale.t('visits.gotIt')),
              ),
            ],
          ),
        ),
      ),
    );
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_securitySeenKey(visitId), true);
  }

  Widget _operatorPicker(VisitRequest visit, LocaleProvider locale, MaresiPalette palette) {
    final baseAmount = (_previews[visit.id]?.stayAmount ?? visit.propertyPrice ?? 0).round();
    final selectedId = _selectedMethods[visit.id];
    PaymentMethod? selected;
    for (final method in PaymentMethod.all) {
      if (method.id == selectedId) selected = method;
    }
    final breakdown = selected == null ? null : calculateTotalAmount(baseAmount, selected, true);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(locale.t('payments.selectMethod'), style: TextStyle(fontWeight: FontWeight.w700, color: palette.text)),
        const SizedBox(height: 4),
        Text(locale.t('payments.selectMethodHint'), style: TextStyle(color: palette.textSecondary, fontSize: 12)),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: PaymentMethod.all.map((method) {
            final active = selectedId == method.id;
            return InkWell(
              onTap: () => setState(() => _selectedMethods[visit.id] = method.id),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: 148,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: active ? AppColors.primary : Colors.grey[300]!,
                    width: active ? 2 : 1,
                  ),
                  color: active ? AppColors.primary.withOpacity(0.06) : Colors.transparent,
                ),
                child: Row(
                  children: [
                    getPaymentMethodLogo(method.id, size: 22, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            method.name,
                            style: TextStyle(fontWeight: FontWeight.w600, color: palette.text, fontSize: 13),
                          ),
                          Text(
                            '${method.operatorFeePercent}%',
                            style: TextStyle(color: palette.textSecondary, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 10),
        if (breakdown != null)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: palette.pillBg,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                _previewRow(locale.t('payments.stayAmount'), '$baseAmount XOF'),
                _previewRow(locale.t('payments.operatorFee'), '${breakdown.operatorFee} XOF'),
                const Divider(),
                _previewRow(locale.t('payments.totalToPay'), '${breakdown.total} XOF', bold: true),
              ],
            ),
          )
        else
          Text(locale.t('payments.chooseOperatorFirst'), style: TextStyle(color: palette.textSecondary, fontSize: 13)),
      ],
    );
  }

  Widget _previewRow(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: Colors.grey[600])),
          Text(value, style: TextStyle(fontSize: 13, fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
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
                                if (visit.checkIn.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Text(visit.stayLabel(), style: TextStyle(color: palette.text, fontSize: 13)),
                                ],
                                const SizedBox(height: 8),
                                Text(
                                  _statusLabel(locale, visit.status),
                                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600),
                                ),
                                if (visit.status == 'awaiting_host_agreement') ...[
                                  const SizedBox(height: 8),
                                  Text(locale.t('visits.agreementWaitingHost'), style: TextStyle(color: palette.textSecondary, fontSize: 13)),
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
                                if (visit.overstay && visit.closedAt == null) ...[
                                  const SizedBox(height: 8),
                                  Text(locale.t('visits.overstayTitle'), style: const TextStyle(fontWeight: FontWeight.w700)),
                                  Text(locale.t('visits.overstayGuestHint'), style: TextStyle(color: palette.textSecondary, fontSize: 13)),
                                ],
                                if (visit.closedAt != null) ...[
                                  const SizedBox(height: 8),
                                  Text(locale.t('visits.stayClosed'), style: TextStyle(color: palette.textSecondary)),
                                ],
                                if (_canRequestExtension(visit)) ...[
                                  const SizedBox(height: 12),
                                  Text(locale.t('visits.extendTitle'), style: TextStyle(fontWeight: FontWeight.w700, color: palette.text)),
                                  const SizedBox(height: 4),
                                  Text(locale.t('visits.extendHint'), style: TextStyle(color: palette.textSecondary, fontSize: 13)),
                                  const SizedBox(height: 8),
                                  OutlinedButton(
                                    onPressed: _actingId == visit.id ? null : () => _pickAndRequestExtension(visit),
                                    child: Text(locale.t('visits.extendCta')),
                                  ),
                                ],
                                if (visit.extensionStatus == 'pending') ...[
                                  const SizedBox(height: 8),
                                  Text(locale.t('visits.extendPending'), style: TextStyle(color: palette.textSecondary, fontSize: 13)),
                                ],
                                if (visit.extensionStatus == 'declined') ...[
                                  const SizedBox(height: 8),
                                  Text(locale.t('visits.extendDeclined'), style: TextStyle(color: palette.textSecondary, fontSize: 13)),
                                ],
                                if (visit.extensionStatus == 'awaiting_payment') ...[
                                  const SizedBox(height: 8),
                                  Text(
                                    '${locale.t('visits.extendAmount')}: ${visit.extensionAmount ?? '—'}',
                                    style: TextStyle(fontWeight: FontWeight.w600, color: palette.text),
                                  ),
                                  Text(locale.t('visits.extendPayHint'), style: TextStyle(color: palette.textSecondary, fontSize: 13)),
                                  const SizedBox(height: 8),
                                  FilledButton(
                                    onPressed: _actingId == visit.id ? null : () => _markExtensionPaid(visit),
                                    style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                                    child: Text(locale.t('visits.iPaidExtension')),
                                  ),
                                ],
                                if (visit.extensionStatus == 'payment_sent') ...[
                                  const SizedBox(height: 8),
                                  Text(locale.t('visits.extendPaidWaiting'), style: TextStyle(color: palette.textSecondary, fontSize: 13)),
                                ],
                                if (visit.status == 'awaiting_payment') ...[
                                  const SizedBox(height: 8),
                                  _operatorPicker(visit, locale, palette),
                                  const SizedBox(height: 8),
                                  FilledButton(
                                      onPressed: _actingId == visit.id || _selectedMethods[visit.id] == null
                                          ? null
                                          : () => _payReservation(visit),
                                      style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                                      child: Text(
                                        _actingId == visit.id
                                            ? locale.t('payments.paying')
                                            : locale.t('payments.payReservation'),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      locale.t('payments.noOffPlatform'),
                                      style: TextStyle(color: palette.textSecondary, fontSize: 13, height: 1.45),
                                    ),
                                ],
                                if (_isPaidStay(visit.status)) ...[
                                  const SizedBox(height: 8),
                                  Text(locale.t('visits.cancelPaidHint'), style: TextStyle(color: palette.textSecondary, fontSize: 12)),
                                ],
                                if (_canCancel(visit.status)) ...[
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
