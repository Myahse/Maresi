import 'package:flutter/material.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';

class ImmoGradientButton extends StatelessWidget {
  const ImmoGradientButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
    this.width = 320,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final double width;

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null || loading;
    return SizedBox(
      width: width,
      height: 48,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: disabled ? const Color(0xFF666666) : AppColors.primary,
          borderRadius: BorderRadius.circular(25),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(25),
            onTap: disabled ? null : onPressed,
            child: Center(
              child: loading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      label,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: disabled ? const Color(0xFF999999) : Colors.white,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class ImmoBottomNav extends StatelessWidget {
  const ImmoBottomNav({
    super.key,
    required this.index,
    required this.onChanged,
    required this.items,
  });

  final int index;
  final ValueChanged<int> onChanged;
  final List<ImmoNavItem> items;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return SafeArea(
      top: false,
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          color: palette.surface,
          border: Border(top: BorderSide(color: palette.border)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: List.generate(items.length, (i) {
            final active = i == index;
            final item = items[i];
            return InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: () => onChanged(i),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                decoration: BoxDecoration(
                  color: active ? palette.navActiveBg : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  active ? item.activeIcon : item.icon,
                  size: item.size,
                  color: palette.text,
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}

class ImmoNavItem {
  const ImmoNavItem({required this.icon, required this.activeIcon, this.size = 24});

  final IconData icon;
  final IconData activeIcon;
  final double size;
}

class ImmoMenuGroup extends StatelessWidget {
  const ImmoMenuGroup({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: palette.menuBorder),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(children: children),
    );
  }
}

class ImmoMenuTile extends StatelessWidget {
  const ImmoMenuTile({
    super.key,
    required this.title,
    required this.icon,
    this.onTap,
    this.trailing,
  });

  final String title;
  final IconData icon;
  final VoidCallback? onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Icon(icon, size: 20, color: palette.text),
              const SizedBox(width: 12),
              Expanded(
                child: Text(title, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: palette.text)),
              ),
              trailing ?? (onTap != null ? Text('›', style: TextStyle(fontSize: 18, color: palette.text)) : const SizedBox.shrink()),
            ],
          ),
        ),
      ),
    );
  }
}

class ImmoMenuDivider extends StatelessWidget {
  const ImmoMenuDivider({super.key});

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Padding(
      padding: const EdgeInsets.only(left: 48),
      child: Divider(height: 1, thickness: 1, color: palette.menuBorder),
    );
  }
}
