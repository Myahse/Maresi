import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:maresi_mobile/models/property_types.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/services/maresi_client.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/utils/property_photos.dart';
import 'package:maresi_mobile/widgets/maresi_card.dart';
import 'package:maresi_mobile/widgets/maresi_stepper.dart';
import 'package:maresi_mobile/widgets/maresi_wizard_actions.dart';
import 'package:maresi_mobile/widgets/property_form_widgets.dart';
import 'package:maresi_mobile/widgets/property_photos_picker.dart';
import 'package:provider/provider.dart';

class PropertyCreateScreen extends StatefulWidget {
  const PropertyCreateScreen({super.key});

  @override
  State<PropertyCreateScreen> createState() => _PropertyCreateScreenState();
}

class _PropertyCreateScreenState extends State<PropertyCreateScreen> {
  static const _pageBg = Color(0xFFF9FAFB);

  final _locationController = TextEditingController();
  final _surfaceController = TextEditingController();
  final _priceController = TextEditingController();
  final _titleController = TextEditingController();

  int _step = 0;
  String? _propertyType;
  bool _loading = false;
  List<XFile> _photos = [];
  TimeOfDay _checkIn = const TimeOfDay(hour: 14, minute: 0);
  TimeOfDay _checkOut = const TimeOfDay(hour: 12, minute: 0);

  @override
  void dispose() {
    _locationController.dispose();
    _surfaceController.dispose();
    _priceController.dispose();
    _titleController.dispose();
    super.dispose();
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  String _cleanError(Object error) {
    final text = error.toString();
    if (text.startsWith('Exception: ')) return text.substring(11);
    return text;
  }

  String _propertyTypeLabel(LocaleProvider locale, String type) => switch (type) {
        PropertyTypes.house => locale.t('register.typeHouse'),
        PropertyTypes.apartment => locale.t('register.typeApartment'),
        PropertyTypes.studio => locale.t('register.typeStudio'),
        PropertyTypes.residence => locale.t('register.typeResidence'),
        _ => type,
      };

  String _buildTitle(LocaleProvider locale) {
    final custom = _titleController.text.trim();
    if (custom.isNotEmpty) return custom;
    final typeLabel = _propertyType != null ? _propertyTypeLabel(locale, _propertyType!) : locale.t('register.typeApartment');
    final location = _locationController.text.trim();
    return location.isEmpty ? 'Résidence $typeLabel' : 'Résidence $typeLabel — $location';
  }

  String _formatClock(TimeOfDay time) =>
      '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';

  Future<void> _pickStayTime({required bool arrival}) async {
    if (_loading) return;
    final picked = await showTimePicker(
      context: context,
      initialTime: arrival ? _checkIn : _checkOut,
    );
    if (picked == null) return;
    setState(() {
      if (arrival) {
        _checkIn = picked;
      } else {
        _checkOut = picked;
      }
    });
  }

  void _continueFromType() {
    final locale = context.read<LocaleProvider>();
    if (_propertyType == null) {
      _showMessage(locale.t('register.propertyTypeRequired'));
      return;
    }
    setState(() => _step = 1);
  }

  void _continueFromDetails() {
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
    setState(() => _step = 2);
  }

  Future<void> _submit() async {
    final locale = context.read<LocaleProvider>();
    if (_photos.length < kMinPropertyPhotos) {
      _showMessage(
        locale.t('propertyCreate.errorMinPhotos').replaceAll('{{min}}', '$kMinPropertyPhotos'),
      );
      return;
    }
    if (_propertyType == null) return;

    final price = int.parse(_priceController.text.trim());

    setState(() => _loading = true);
    try {
      await maresiApi.createProperty(
        title: _buildTitle(locale),
        description: 'Superficie : ${_surfaceController.text.trim()} m²',
        price: price,
        location: _locationController.text.trim(),
        propertyType: _propertyType!,
        imagePaths: _photos.map((p) => p.path).toList(),
        checkInTime: _formatClock(_checkIn),
        checkOutTime: _formatClock(_checkOut),
      );
      if (!mounted) return;
      _showMessage(locale.t('propertyCreate.success'));
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) _showMessage(_cleanError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _goBack() {
    if (_loading) return;
    if (_step > 0) {
      setState(() => _step -= 1);
      return;
    }
    Navigator.of(context).pop();
  }

  void _onNext() {
    switch (_step) {
      case 0:
        _continueFromType();
      case 1:
        _continueFromDetails();
      case 2:
        _submit();
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final steps = [
      locale.t('register.stepType'),
      locale.t('register.stepListing'),
      locale.t('propertyCreate.stepPhotos'),
    ];

    return Scaffold(
      backgroundColor: _pageBg,
      appBar: AppBar(
        backgroundColor: _pageBg,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF111827)),
          onPressed: _goBack,
        ),
        title: Text(locale.t('propertyCreate.title')),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: MaresiStepper(steps: steps, currentStep: _step),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: MaresiCard(
                child: switch (_step) {
                  0 => _buildTypeStep(locale),
                  1 => _buildDetailsStep(locale),
                  _ => _buildPhotosStep(locale),
                },
              ),
            ),
          ),
          MaresiWizardActions(
            showBack: _step > 0,
            onBack: _goBack,
            onNext: _onNext,
            nextLabel: _step == 2 ? locale.t('propertyCreate.publish') : locale.t('register.next'),
            loading: _loading,
          ),
        ],
      ),
    );
  }

  Widget _buildTypeStep(LocaleProvider locale) {
    final types = [
      (PropertyTypes.house, locale.t('register.typeHouse')),
      (PropertyTypes.apartment, locale.t('register.typeApartment')),
      (PropertyTypes.studio, locale.t('register.typeStudio')),
      (PropertyTypes.residence, locale.t('register.typeResidence')),
    ];

    return Column(
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
            child: PropertySelectTile(
              label: entry.$2,
              selected: _propertyType == entry.$1,
              onTap: () => setState(() => _propertyType = entry.$1),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailsStep(LocaleProvider locale) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MaresiSectionHeader(
          title: locale.t('register.propertyDetailsTitle'),
          subtitle: locale.t('register.propertyDetailsHint'),
        ),
        if (_propertyType != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
            ),
            child: Text(
              _propertyTypeLabel(locale, _propertyType!),
              style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 14),
            ),
          ),
        ],
        const SizedBox(height: 20),
        PropertyLabeledField(
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
              child: PropertyLabeledField(
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
              child: PropertyLabeledField(
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
        PropertyLabeledField(
          label: locale.t('register.titleLabel'),
          child: TextField(
            controller: _titleController,
            enabled: !_loading,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(hintText: locale.t('register.titleHint')),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: PropertyLabeledField(
                label: locale.t('register.checkInTime'),
                child: OutlinedButton(
                  onPressed: _loading ? null : () => _pickStayTime(arrival: true),
                  child: Text(_formatClock(_checkIn)),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: PropertyLabeledField(
                label: locale.t('register.checkOutTime'),
                child: OutlinedButton(
                  onPressed: _loading ? null : () => _pickStayTime(arrival: false),
                  child: Text(_formatClock(_checkOut)),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPhotosStep(LocaleProvider locale) {
    return Column(
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
}
