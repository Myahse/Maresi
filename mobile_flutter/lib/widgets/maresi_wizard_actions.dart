import 'package:flutter/material.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/widgets/immo_widgets.dart';

/// Wizard footer — matches maresi/web PropertyCreationWizard actions.
class MaresiWizardActions extends StatelessWidget {
  const MaresiWizardActions({
    super.key,
    required this.onNext,
    required this.nextLabel,
    this.onBack,
    this.loading = false,
    this.showBack = true,
  });

  final VoidCallback? onBack;
  final VoidCallback? onNext;
  final String nextLabel;
  final bool loading;
  final bool showBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE5E7EB))),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            if (showBack && onBack != null)
              OutlinedButton(
                onPressed: loading ? null : onBack,
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF111827),
                  side: const BorderSide(color: Color(0xFFE5E7EB)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                ),
                child: const Text('Retour', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              ),
            const Spacer(),
            ImmoGradientButton(
              label: nextLabel,
              width: 140,
              loading: loading,
              onPressed: loading ? null : onNext,
            ),
          ],
        ),
      ),
    );
  }
}

/// Pill role / intent switcher — matches maresi/web LoginModal tab bar.
class MaresiPillSelector extends StatelessWidget {
  const MaresiPillSelector({
    super.key,
    required this.options,
    required this.selectedIndex,
    required this.onSelected,
  });

  final List<String> options;
  final int? selectedIndex;
  final ValueChanged<int> onSelected;

  static const _muted = Color(0xFFF5F5F5);
  static const _inactive = Color(0xFF4B5563);

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(color: _muted, borderRadius: BorderRadius.circular(999)),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Row(
          children: [
            for (var i = 0; i < options.length; i++)
              Expanded(
                child: Material(
                  color: selectedIndex == i ? AppColors.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(999),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: () => onSelected(i),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
                      child: Text(
                        options[i],
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: selectedIndex == i ? Colors.white : _inactive,
                          height: 1.2,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
