import 'package:flutter/material.dart';
import 'package:maresi_mobile/models/property.dart';
import 'package:maresi_mobile/models/visit_request.dart';
import 'package:maresi_mobile/providers/auth_provider.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/services/maresi_client.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/widgets/immo_widgets.dart';
import 'package:maresi_mobile/widgets/maresi_card.dart';
import 'package:maresi_mobile/widgets/maresi_stepper.dart';
import 'package:maresi_mobile/widgets/maresi_wizard_actions.dart';
import 'package:maresi_mobile/widgets/property_card.dart';
import 'package:maresi_mobile/widgets/property_form_widgets.dart';
import 'package:provider/provider.dart';

class ReservationFlowScreen extends StatefulWidget {
  const ReservationFlowScreen({super.key, required this.property});

  final Property property;

  @override
  State<ReservationFlowScreen> createState() => _ReservationFlowScreenState();
}

class _ReservationFlowScreenState extends State<ReservationFlowScreen> {
  static const _pageBg = Color(0xFFF9FAFB);
  static const _timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

  int _step = 0;
  bool _loading = false;
  bool _done = false;

  String? _checkIn;
  String? _checkOut;
  bool _includeVisit = false;
  String? _visitDate;
  String _visitTime = '10:00';
  TimeOfDay _arrival = const TimeOfDay(hour: 14, minute: 0);
  TimeOfDay _departure = const TimeOfDay(hour: 12, minute: 0);
  final _guestsController = TextEditingController(text: '2');
  final _phoneController = TextEditingController();
  final _idCardController = TextEditingController();
  final _messageController = TextEditingController();

  @override
  void dispose() {
    _guestsController.dispose();
    _phoneController.dispose();
    _idCardController.dispose();
    _messageController.dispose();
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

  Future<String?> _pickDate(LocaleProvider locale) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      helpText: locale.t('reserve.pickDate'),
    );
    if (picked == null) return null;
    return _formatDate(picked);
  }

  String _formatDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String _formatClock(TimeOfDay time) =>
      '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';

  Future<void> _pickStayTime({required bool arrival}) async {
    if (_loading) return;
    final picked = await showTimePicker(
      context: context,
      initialTime: arrival ? _arrival : _departure,
    );
    if (picked == null) return;
    setState(() {
      if (arrival) {
        _arrival = picked;
      } else {
        _departure = picked;
      }
    });
  }

  bool _isFutureDate(String? value) {
    if (value == null || value.isEmpty) return false;
    final parts = value.split('-');
    if (parts.length != 3) return false;
    final date = DateTime(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);
    return !date.isBefore(todayDate);
  }

  bool _isValidIdCard(String value) {
    final trimmed = value.trim();
    if (trimmed.length < 5) return false;
    return RegExp(r'^[A-Za-z0-9\-/\s]+$').hasMatch(trimmed);
  }

  String? _validateStep(LocaleProvider locale) {
    switch (_step) {
      case 0:
        if (_checkIn == null || _checkOut == null) return locale.t('reserve.errorDatesRequired');
        if (!_isFutureDate(_checkIn)) return locale.t('reserve.errorCheckInFuture');
        if (_checkOut!.compareTo(_checkIn!) < 0) return locale.t('reserve.errorCheckOutAfter');
        if (_checkIn == _checkOut && _formatClock(_arrival).compareTo(_formatClock(_departure)) >= 0) {
          return locale.t('reserve.errorTimesOrder');
        }
        return null;
      case 1:
        if (!_includeVisit) return null;
        if (_visitDate == null) return locale.t('reserve.errorVisitDate');
        if (!_isFutureDate(_visitDate)) return locale.t('reserve.errorVisitFuture');
        if (_visitTime.isEmpty) return locale.t('reserve.errorVisitTime');
        return null;
      case 2:
        final guests = int.tryParse(_guestsController.text.trim());
        if (guests == null || guests < 1) return locale.t('reserve.errorGuests');
        final phone = _phoneController.text.trim();
        if (phone.length < 8) return locale.t('reserve.errorPhone');
        final idCard = _idCardController.text.trim();
        if (!_isValidIdCard(idCard)) return locale.t('reserve.errorIdCard');
        return null;
      default:
        return null;
    }
  }

  void _onNext() {
    final locale = context.read<LocaleProvider>();
    final error = _validateStep(locale);
    if (error != null) {
      _showMessage(error);
      return;
    }
    if (_step < 3) {
      setState(() => _step++);
      return;
    }
    _submit();
  }

  void _goBack() {
    if (_loading) return;
    if (_step > 0) {
      setState(() => _step--);
      return;
    }
    Navigator.of(context).pop();
  }

  Future<void> _submit() async {
    final locale = context.read<LocaleProvider>();
    final auth = context.read<AuthProvider>();
    if (auth.user?.isSuspended == true) {
      _showMessage(locale.t('account.suspendedHint'));
      return;
    }
    setState(() => _loading = true);
    try {
      await maresiApi.createVisitRequest(
        VisitRequestPayload(
          propertyId: widget.property.id,
          checkIn: _checkIn!,
          checkOut: _checkOut!,
          arrivalTime: _formatClock(_arrival),
          departureTime: _formatClock(_departure),
          visitDate: _includeVisit ? _visitDate : null,
          visitTime: _includeVisit ? _visitTime : null,
          guestsCount: int.parse(_guestsController.text.trim()),
          contactPhone: _phoneController.text.trim(),
          idCard: _idCardController.text.trim(),
          message: _messageController.text.trim(),
        ),
      );
      if (mounted) setState(() => _done = true);
    } catch (e) {
      if (mounted) _showMessage(_cleanError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    if (_done) {
      return Scaffold(
        backgroundColor: _pageBg,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.check_circle, color: AppColors.primary, size: 72),
                const SizedBox(height: 20),
                Text(
                  locale.t('reserve.successTitle'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF111827)),
                ),
                const SizedBox(height: 10),
                Text(
                  locale.t('reserve.successText'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, color: Color(0xFF4B5563), height: 1.4),
                ),
                const SizedBox(height: 28),
                ImmoGradientButton(
                  label: locale.t('reserve.backHome'),
                  width: double.infinity,
                  onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final steps = [
      locale.t('reserve.stepDates'),
      locale.t('reserve.stepVisit'),
      locale.t('reserve.stepContact'),
      locale.t('reserve.stepReview'),
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
        title: Text(locale.t('reserve.title')),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Text(
              widget.property.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: MaresiStepper(steps: steps, currentStep: _step),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: MaresiCard(
                child: switch (_step) {
                  0 => _buildDatesStep(locale),
                  1 => _buildVisitStep(locale),
                  2 => _buildContactStep(locale),
                  _ => _buildReviewStep(locale),
                },
              ),
            ),
          ),
          MaresiWizardActions(
            showBack: _step > 0,
            onBack: _goBack,
            onNext: _onNext,
            nextLabel: _step == 3 ? locale.t('reserve.submit') : locale.t('register.next'),
            loading: _loading,
          ),
        ],
      ),
    );
  }

  Widget _buildDatesStep(LocaleProvider locale) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MaresiSectionHeader(
          title: locale.t('reserve.datesTitle'),
          subtitle: locale.t('reserve.datesHint'),
        ),
        const SizedBox(height: 8),
        Text(
          formatPrice(widget.property.price),
          style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 20),
        _DateField(
          label: locale.t('reserve.checkIn'),
          value: _checkIn,
          onTap: () async {
            final picked = await _pickDate(locale);
            if (picked != null) setState(() => _checkIn = picked);
          },
        ),
        const SizedBox(height: 16),
        _DateField(
          label: locale.t('reserve.arrivalTime'),
          value: _formatClock(_arrival),
          icon: Icons.schedule,
          onTap: () => _pickStayTime(arrival: true),
        ),
        const SizedBox(height: 16),
        _DateField(
          label: locale.t('reserve.checkOut'),
          value: _checkOut,
          onTap: () async {
            final picked = await _pickDate(locale);
            if (picked != null) setState(() => _checkOut = picked);
          },
        ),
        const SizedBox(height: 16),
        _DateField(
          label: locale.t('reserve.departureTime'),
          value: _formatClock(_departure),
          icon: Icons.schedule,
          onTap: () => _pickStayTime(arrival: false),
        ),
      ],
    );
  }

  Widget _buildVisitStep(LocaleProvider locale) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MaresiSectionHeader(
          title: locale.t('reserve.visitTitle'),
          subtitle: locale.t('reserve.visitHint'),
        ),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          value: _includeVisit,
          onChanged: _loading ? null : (v) => setState(() => _includeVisit = v ?? false),
          title: Text(locale.t('reserve.addVisit')),
        ),
        if (_includeVisit) ...[
        const SizedBox(height: 8),
        _DateField(
          label: locale.t('reserve.visitDate'),
          value: _visitDate,
          onTap: () async {
            final picked = await _pickDate(locale);
            if (picked != null) setState(() => _visitDate = picked);
          },
        ),
        const SizedBox(height: 16),
        PropertyLabeledField(
          label: locale.t('reserve.visitTime'),
          child: DropdownButtonFormField<String>(
            value: _visitTime,
            items: _timeSlots
                .map((slot) => DropdownMenuItem(value: slot, child: Text(slot)))
                .toList(),
            onChanged: _loading ? null : (v) => setState(() => _visitTime = v ?? _visitTime),
          ),
        ),
        ],
      ],
    );
  }

  Widget _buildContactStep(LocaleProvider locale) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MaresiSectionHeader(
          title: locale.t('reserve.contactTitle'),
          subtitle: locale.t('reserve.contactHint'),
        ),
        const SizedBox(height: 20),
        PropertyLabeledField(
          label: locale.t('reserve.guests'),
          child: TextField(
            controller: _guestsController,
            enabled: !_loading,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(hintText: '2'),
          ),
        ),
        const SizedBox(height: 16),
        PropertyLabeledField(
          label: locale.t('reserve.phone'),
          child: TextField(
            controller: _phoneController,
            enabled: !_loading,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(hintText: '+225 07 00 00 00 00'),
          ),
        ),
        const SizedBox(height: 16),
        PropertyLabeledField(
          label: locale.t('reserve.idCard'),
          child: TextField(
            controller: _idCardController,
            enabled: !_loading,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(hintText: locale.t('reserve.idCardHint')),
          ),
        ),
        const SizedBox(height: 16),
        PropertyLabeledField(
          label: locale.t('reserve.message'),
          child: TextField(
            controller: _messageController,
            enabled: !_loading,
            maxLines: 3,
            decoration: InputDecoration(hintText: locale.t('reserve.messageHint')),
          ),
        ),
      ],
    );
  }

  Widget _buildReviewStep(LocaleProvider locale) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MaresiSectionHeader(
          title: locale.t('reserve.reviewTitle'),
          subtitle: locale.t('reserve.validationNote'),
        ),
        const SizedBox(height: 16),
        _ReviewRow(label: locale.t('reserve.residence'), value: widget.property.title),
        _ReviewRow(label: locale.t('reserve.stay'), value: '$_checkIn ${_formatClock(_arrival)} → $_checkOut ${_formatClock(_departure)}'),
        _ReviewRow(
          label: locale.t('reserve.visitSlot'),
          value: _includeVisit ? '$_visitDate · $_visitTime' : locale.t('reserve.visitSkipped'),
        ),
        _ReviewRow(label: locale.t('reserve.guests'), value: _guestsController.text.trim()),
        _ReviewRow(label: locale.t('reserve.phone'), value: _phoneController.text.trim()),
        _ReviewRow(label: locale.t('reserve.idCard'), value: _idCardController.text.trim()),
      ],
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({
    required this.label,
    required this.value,
    required this.onTap,
    this.icon = Icons.calendar_today_outlined,
  });

  final String label;
  final String? value;
  final VoidCallback onTap;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return PropertyLabeledField(
      label: label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: InputDecorator(
          decoration: InputDecoration(
            suffixIcon: Icon(icon, size: 18),
          ),
          child: Text(
            value ?? '—',
            style: TextStyle(
              color: value != null ? const Color(0xFF111827) : const Color(0xFF9CA3AF),
            ),
          ),
        ),
      ),
    );
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(label, style: const TextStyle(color: Color(0xFF6B7280), fontSize: 14))),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Color(0xFF111827)),
            ),
          ),
        ],
      ),
    );
  }
}
