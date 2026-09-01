import 'package:flutter/material.dart';
import 'package:maresi_mobile/models/visit_request.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/services/maresi_client.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:maresi_mobile/widgets/immo_widgets.dart';
import 'package:provider/provider.dart';

class StayAgreementScreen extends StatefulWidget {
  const StayAgreementScreen({super.key, required this.visit});

  final VisitRequest visit;

  @override
  State<StayAgreementScreen> createState() => _StayAgreementScreenState();
}

class _StayAgreementScreenState extends State<StayAgreementScreen> {
  final _name = TextEditingController();
  final _checks = List<bool>.filled(5, false);
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final locale = context.read<LocaleProvider>();
    if (_checks.contains(false) || _name.text.trim().length < 3) return;
    setState(() => _saving = true);
    try {
      await maresiApi.signStayAgreement(widget.visit.id, _name.text.trim());
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final palette = context.palette;
    final articles = [
      locale.t('visits.agreementArt1'),
      locale.t('visits.agreementArt2'),
      locale.t('visits.agreementArt3'),
      locale.t('visits.agreementArt4'),
      locale.t('visits.agreementArt5'),
    ];
    final ready = !_checks.contains(false) && _name.text.trim().length >= 3;

    return Scaffold(
      backgroundColor: const Color(0xFFF4EFE6),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF4EFE6),
        surfaceTintColor: Colors.transparent,
        title: Text(locale.t('visits.agreementTitle')),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xFFE6DCC8)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Text(
                    'MARESI',
                    style: TextStyle(
                      letterSpacing: 3,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Text(
                    locale.t('visits.agreementTitle'),
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: palette.text),
                  ),
                ),
                const SizedBox(height: 16),
                Text(locale.t('visits.agreementPreamble'), style: TextStyle(height: 1.45, color: palette.text)),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  color: const Color(0xFFFAF7F1),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(widget.visit.propertyTitle ?? locale.t('nav.property'), style: const TextStyle(fontWeight: FontWeight.w700)),
                      if (widget.visit.location != null) Text(widget.visit.location!, style: TextStyle(color: palette.textSecondary)),
                      const SizedBox(height: 6),
                      Text(widget.visit.stayLabel()),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                ...List.generate(articles.length, (i) {
                  return CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: _checks[i],
                    activeColor: AppColors.primary,
                    onChanged: (v) => setState(() => _checks[i] = v ?? false),
                    title: Text(
                      '${locale.t('visits.agreementArticle').replaceAll('{{n}}', '${i + 1}')} — ${articles[i]}',
                      style: const TextStyle(fontSize: 14, height: 1.4),
                    ),
                    controlAffinity: ListTileControlAffinity.leading,
                  );
                }),
                const SizedBox(height: 12),
                TextField(
                  controller: _name,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(labelText: locale.t('visits.agreementSignAs')),
                ),
                const SizedBox(height: 8),
                Text(locale.t('visits.agreementSignLegal'), style: TextStyle(fontSize: 12, color: palette.textSecondary)),
                const SizedBox(height: 20),
                ImmoGradientButton(
                  label: _saving ? locale.t('common.saving') : locale.t('visits.agreementSign'),
                  loading: _saving,
                  width: double.infinity,
                  onPressed: ready && !_saving ? _submit : null,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
