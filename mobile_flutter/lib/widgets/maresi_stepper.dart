import 'package:flutter/material.dart';
import 'package:maresi_mobile/theme/app_colors.dart';

/// Horizontal step indicator — matches maresi/web `stepper.tsx`.
class MaresiStepper extends StatelessWidget {
  const MaresiStepper({
    super.key,
    required this.steps,
    required this.currentStep,
  });

  final List<String> steps;
  final int currentStep;

  static const _gray200 = Color(0xFFE5E7EB);
  static const _gray300 = Color(0xFFD1D5DB);
  static const _gray400 = Color(0xFF9CA3AF);
  static const _gray700 = Color(0xFF374151);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < steps.length; i++) ...[
          Expanded(
            child: Column(
              children: [
                Row(
                  children: [
                    if (i > 0)
                      Expanded(
                        child: Container(
                          height: 2,
                          color: i <= currentStep ? AppColors.primary : _gray200,
                        ),
                      ),
                    _StepCircle(
                      index: i + 1,
                      done: i < currentStep,
                      active: i == currentStep,
                    ),
                    if (i < steps.length - 1)
                      Expanded(
                        child: Container(
                          height: 2,
                          color: i < currentStep ? AppColors.primary : _gray200,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  steps[i],
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: i == currentStep
                        ? AppColors.primary
                        : i < currentStep
                            ? _gray700
                            : _gray400,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _StepCircle extends StatelessWidget {
  const _StepCircle({
    required this.index,
    required this.done,
    required this.active,
  });

  final int index;
  final bool done;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final Color borderColor;
    final Color bgColor;
    final Color fgColor;

    if (done) {
      borderColor = AppColors.primary;
      bgColor = AppColors.primary;
      fgColor = Colors.white;
    } else if (active) {
      borderColor = AppColors.primary;
      bgColor = AppColors.primary.withValues(alpha: 0.1);
      fgColor = AppColors.primary;
    } else {
      borderColor = MaresiStepper._gray300;
      bgColor = Colors.white;
      fgColor = MaresiStepper._gray400;
    }

    return Container(
      width: 32,
      height: 32,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: bgColor,
        shape: BoxShape.circle,
        border: Border.all(color: borderColor, width: 2),
      ),
      child: done
          ? const Icon(Icons.check, size: 16, color: Colors.white)
          : Text(
              '$index',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: fgColor),
            ),
    );
  }
}
