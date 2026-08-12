import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:maresi_mobile/models/property_types.dart';
import 'package:maresi_mobile/models/user.dart';
import 'package:maresi_mobile/navigation/auth_navigation.dart';
import 'package:maresi_mobile/providers/auth_provider.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/services/maresi_client.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/utils/property_photos.dart';
import 'package:maresi_mobile/widgets/maresi_card.dart';
import 'package:maresi_mobile/widgets/maresi_stepper.dart';
import 'package:maresi_mobile/widgets/maresi_wizard_actions.dart';
import 'package:maresi_mobile/widgets/property_photos_picker.dart';
import 'package:provider/provider.dart';

class RegistrationFlowScreen extends StatefulWidget {
  const RegistrationFlowScreen({super.key});

  @override
  State<RegistrationFlowScreen> createState() => _RegistrationFlowScreenState();
}

class _RegistrationFlowScreenState extends State<RegistrationFlowScreen> {
  static const _stepIntent = 0;
  static const _stepPropertyType = 1;
  static const _stepPropertyDetails = 2;
  static const _stepPropertyPhotos = 3;
  static const _stepAccount = 4;

  static const _pageBg = Color(0xFFF9FAFB);

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _locationController = TextEditingController();
  final _surfaceController = TextEditingController();
  final _priceController = TextEditingController();
  final _titleController = TextEditingController();

  int? _intentIndex;
  int _step = _stepIntent;
  UserRole? _role;
  String? _propertyType;
  bool _loading = false;
  bool _obscurePassword = true;
  List<XFile> _photos = [];

  bool get _isOwner => _role == UserRole.owner;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _locationController.dispose();
    _surfaceController.dispose();
    _priceController.dispose();
    _titleController.dispose();
    super.dispose();
  }

  UserRole _roleForIndex(int index) => index == 0 ? UserRole.client : UserRole.owner;

  List<String> _stepLabels(LocaleProvider locale) {
    if (!_isOwner) {
      return [locale.t('register.stepProfile'), locale.t('register.stepAccount')];
    }
    return [
      locale.t('register.stepProfile'),
      locale.t('register.stepType'),
      locale.t('register.stepListing'),
      locale.t('register.stepPhotos'),
      locale.t('register.stepAccount'),
    ];
  }

  int _stepperIndex() {
    if (!_isOwner) return _step == _stepAccount ? 1 : 0;
    return _step;
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  String _cleanError(Object error) {
    final text = error.toString();
    if (text.startsWith('Exception: ')) return text.substring(11);
    return text;
  }

  void _selectIntent(int index) {
    if (_loading) return;
    setState(() {
      _intentIndex = index;
      _role = _roleForIndex(index);
    });
  }

  void _selectPropertyType(String type) {
    if (_loading) return;
    setState(() => _propertyType = type);
  }

  void _continueFromIntent() {
    final locale = context.read<LocaleProvider>();
    if (_intentIndex == null || _role == null) {
      _showMessage(locale.t('register.intentRequired'));
      return;
    }
    setState(() => _step = _isOwner ? _stepPropertyType : _stepAccount);
  }

  void _continueFromPropertyType() {
    final locale = context.read<LocaleProvider>();
    if (_propertyType == null) {
      _showMessage(locale.t('register.propertyTypeRequired'));
      return;
    }
    setState(() => _step = _stepPropertyDetails);
  }

  void _continueFromPropertyDetails() {
    final locale = context.read<LocaleProvider>();
    final location = _locationController.text.trim();
    final surface = double.tryParse(_surfaceController.text.trim().replaceAll(',', '.'));
    final price = int.tryParse(_priceController.text.trim());

    if (location.length < 3) {
      _showMessage(locale.t('register.errorLocation'));
      return;
    }
    if (surface == null || surface < 10 || surface > 10000) {
      _showMessage(locale.t('register.errorSurface'));
      return;
    }
    if (price == null || price < 1000) {
      _showMessage(locale.t('register.errorPrice'));
      return;
    }
    setState(() => _step = _stepPropertyPhotos);
  }

  void _continueFromPropertyPhotos() {
    final locale = context.read<LocaleProvider>();
    if (_photos.length < kMinPropertyPhotos) {
      _showMessage(
        locale.t('propertyCreate.errorMinPhotos').replaceAll('{{min}}', '$kMinPropertyPhotos'),
      );
      return;
    }
    setState(() => _step = _stepAccount);
  }

  String _propertyTypeLabel(LocaleProvider locale, String type) => switch (type) {
        PropertyTypes.house => locale.t('register.typeHouse'),
        PropertyTypes.apartment => locale.t('register.typeApartment'),
        PropertyTypes.studio => locale.t('register.typeStudio'),
        _ => type,
      };

  String _buildPropertyTitle(LocaleProvider locale) {
    final custom = _titleController.text.trim();
    if (custom.isNotEmpty) return custom;
    final typeLabel = _propertyType != null ? _propertyTypeLabel(locale, _propertyType!) : locale.t('register.typeApartment');
    final location = _locationController.text.trim();
    return location.isEmpty ? 'Résidence $typeLabel' : 'Résidence $typeLabel — $location';
  }

  Future<void> _submit() async {
    final locale = context.read<LocaleProvider>();
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final name = _nameController.text.trim();
    final role = _role ?? UserRole.client;

    if (email.isEmpty || !email.contains('@')) {
      _showMessage(locale.t('auth.errorEmail'));
      return;
    }
    if (password.length < 6) {
      _showMessage(locale.t('auth.errorPassword'));
      return;
    }
    if (name.isEmpty) {
      _showMessage(locale.t('auth.errorName'));
      return;
    }

    setState(() => _loading = true);
    try {
      await context.read<AuthProvider>().register(
            email: email,
            password: password,
            fullName: name,
            role: role,
          );

      if (_isOwner && _propertyType != null) {
        final surface = _surfaceController.text.trim();
        await maresiApi.createProperty(
          title: _buildPropertyTitle(locale),
          description: 'Superficie : $surface m²',
          price: int.parse(_priceController.text.trim()),
          location: _locationController.text.trim(),
          propertyType: _propertyType!,
          imagePaths: _photos.map((p) => p.path).toList(),
        );
      }

      if (mounted) goHomeAfterAuth(context);
    } catch (e) {
      if (mounted) _showMessage(_cleanError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _goBack() {
    if (_loading) return;
    if (_step == _stepAccount) {
      setState(() => _step = _isOwner ? _stepPropertyDetails : _stepIntent);
      return;
    }
    if (_step == _stepPropertyDetails) {
      setState(() => _step = _stepPropertyType);
      return;
    }
    if (_step == _stepPropertyPhotos) {
      setState(() => _step = _stepPropertyDetails);
      return;
    }
    if (_step == _stepPropertyType) {
      setState(() => _step = _stepIntent);
      return;
    }
    Navigator.of(context).pop();
  }

  void _onNext() {
    switch (_step) {
      case _stepIntent:
        _continueFromIntent();
      case _stepPropertyType:
        _continueFromPropertyType();
      case _stepPropertyDetails:
        _continueFromPropertyDetails();
      case _stepPropertyPhotos:
        _continueFromPropertyPhotos();
      case _stepAccount:
        _submit();
    }
  }

  String _nextLabel(LocaleProvider locale) {
    if (_step == _stepAccount) return locale.t('auth.createAccount');
    return locale.t('register.next');
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return Scaffold(
      backgroundColor: _pageBg,
      appBar: AppBar(
        backgroundColor: _pageBg,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF111827)),
          onPressed: _goBack,
        ),
        title: Text(locale.t('register.flowTitle')),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: MaresiStepper(steps: _stepLabels(locale), currentStep: _stepperIndex()),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: MaresiCard(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 280),
                  child: switch (_step) {
                    _stepIntent => _buildIntentStep(locale),
                    _stepPropertyType => _buildPropertyTypeStep(locale),
                    _stepPropertyDetails => _buildPropertyDetailsStep(locale),
                    _stepPropertyPhotos => _buildPropertyPhotosStep(locale),
                    _ => _buildAccountStep(locale),
                  },
                ),
              ),
            ),
          ),
          MaresiWizardActions(
            showBack: _step > _stepIntent,
            onBack: _goBack,
            onNext: _onNext,
            nextLabel: _nextLabel(locale),
            loading: _loading,
          ),
        ],
      ),
    );
  }

  Widget _buildIntentStep(LocaleProvider locale) {
    return Column(
      key: const ValueKey('intent'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MaresiSectionHeader(
          title: locale.t('register.profileTitle'),
          subtitle: locale.t('register.profileHint'),
        ),
        const SizedBox(height: 20),
        MaresiPillSelector(
          options: [locale.t('register.intentRent'), locale.t('register.intentList')],
          selectedIndex: _intentIndex,
          onSelected: _selectIntent,
        ),
      ],
    );
  }

  Widget _buildPropertyTypeStep(LocaleProvider locale) {
    final types = [
      (PropertyTypes.house, locale.t('register.typeHouse')),
      (PropertyTypes.apartment, locale.t('register.typeApartment')),
      (PropertyTypes.studio, locale.t('register.typeStudio')),
    ];

    return Column(
      key: const ValueKey('property-type'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MaresiSectionHeader(
          title: locale.t('register.propertyTypeTitle'),
          subtitle: locale.t('register.propertyTypeHint'),
        ),
        const SizedBox(height: 20),
        ...types.map(
          (entry) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _WebSelectTile(
              label: entry.$2,
              selected: _propertyType == entry.$1,
              onTap: () => _selectPropertyType(entry.$1),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPropertyDetailsStep(LocaleProvider locale) {
    return Column(
      key: const ValueKey('property-details'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MaresiSectionHeader(
          title: locale.t('register.propertyDetailsTitle'),
          subtitle: locale.t('register.propertyDetailsHint'),
        ),
        if (_propertyType != null) ...[
          const SizedBox(height: 12),
          _SummaryChip(label: _propertyTypeLabel(locale, _propertyType!)),
        ],
        const SizedBox(height: 20),
        _LabeledField(
          label: locale.t('register.locationLabel'),
          child: TextField(
            controller: _locationController,
            enabled: !_loading,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(hintText: locale.t('register.locationHint')),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _LabeledField(
                label: locale.t('register.surfaceLabel'),
                child: TextField(
                  controller: _surfaceController,
                  enabled: !_loading,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.,]'))],
                  decoration: InputDecoration(hintText: locale.t('register.surfaceHint')),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _LabeledField(
                label: locale.t('register.priceLabel'),
                child: TextField(
                  controller: _priceController,
                  enabled: !_loading,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: InputDecoration(hintText: locale.t('register.priceHint')),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _LabeledField(
          label: locale.t('register.titleLabel'),
          child: TextField(
            controller: _titleController,
            enabled: !_loading,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(hintText: locale.t('register.titleHint')),
          ),
        ),
      ],
    );
  }

  Widget _buildPropertyPhotosStep(LocaleProvider locale) {
    return Column(
      key: const ValueKey('property-photos'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MaresiSectionHeader(
          title: locale.t('propertyCreate.photosTitle'),
          subtitle: locale.t('propertyCreate.photosHint').replaceAll('{{min}}', '$kMinPropertyPhotos'),
        ),
        const SizedBox(height: 20),
        PropertyPhotosPicker(
          photos: _photos,
          enabled: !_loading,
          locale: locale,
          onChanged: (next) => setState(() => _photos = next),
        ),
      ],
    );
  }

  Widget _buildAccountStep(LocaleProvider locale) {
    final role = _role ?? UserRole.client;
    final roleLabel = role == UserRole.owner ? locale.t('profile.roleOwner') : locale.t('profile.roleClient');

    return Column(
      key: const ValueKey('account'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MaresiSectionHeader(
          title: locale.t('register.detailsTitle'),
          subtitle: locale.t('register.detailsSubtitle'),
        ),
        const SizedBox(height: 12),
        _SummaryChip(label: roleLabel),
        const SizedBox(height: 20),
        _LabeledField(
          label: locale.t('auth.nameLabel'),
          child: TextField(
            controller: _nameController,
            enabled: !_loading,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(hintText: locale.t('auth.nameHint')),
          ),
        ),
        const SizedBox(height: 16),
        _LabeledField(
          label: locale.t('auth.emailLabel'),
          child: TextField(
            controller: _emailController,
            enabled: !_loading,
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            decoration: InputDecoration(hintText: locale.t('auth.emailHint')),
          ),
        ),
        const SizedBox(height: 16),
        _LabeledField(
          label: locale.t('auth.passwordLabel'),
          child: TextField(
            controller: _passwordController,
            enabled: !_loading,
            obscureText: _obscurePassword,
            decoration: InputDecoration(
              hintText: locale.t('auth.passwordHint'),
              suffixIcon: IconButton(
                onPressed: _loading ? null : () => setState(() => _obscurePassword = !_obscurePassword),
                icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
              ),
            ),
            onSubmitted: (_) => _submit(),
          ),
        ),
      ],
    );
  }
}

class _WebSelectTile extends StatelessWidget {
  const _WebSelectTile({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.primary.withValues(alpha: 0.08) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: selected ? AppColors.primary : const Color(0xFFE5E7EB),
          width: 2,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Icon(
                selected ? Icons.radio_button_checked : Icons.radio_button_off,
                color: selected ? AppColors.primary : const Color(0xFF9CA3AF),
                size: 20,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                    color: const Color(0xFF111827),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  const _SummaryChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
      ),
      child: Text(
        label,
        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 14),
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}
