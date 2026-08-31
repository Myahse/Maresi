import 'package:flutter/material.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/services/maresi_client.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:provider/provider.dart';

class IdentityDossierScreen extends StatefulWidget {
  const IdentityDossierScreen({super.key});

  @override
  State<IdentityDossierScreen> createState() => _IdentityDossierScreenState();
}

class _IdentityDossierScreenState extends State<IdentityDossierScreen> {
  Map<String, dynamic>? _profile;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final profile = await maresiApi.getMyProfile();
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final palette = context.palette;
    final profile = _profile;
    return Scaffold(
      appBar: AppBar(title: Text(locale.t('account.title'))),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(locale.t('account.hint'), style: TextStyle(color: palette.textSecondary)),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: Colors.red)),
                ],
                if (profile != null) ...[
                  const SizedBox(height: 20),
                  _row(locale.t('auth.nameLabel'), '${profile['full_name'] ?? ''}'),
                  _row(locale.t('auth.emailLabel'), '${profile['email'] ?? ''}'),
                  _row(locale.t('register.phone'), '${profile['phone'] ?? '—'}'),
                  _row(locale.t('register.idCardNumber'), '${profile['id_card'] ?? '—'}'),
                ],
              ],
            ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
