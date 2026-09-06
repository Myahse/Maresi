import 'package:flutter/material.dart';
import 'package:maresi_mobile/theme/app_colors.dart';

class FavoriteHeart extends StatefulWidget {
  const FavoriteHeart({
    super.key,
    required this.liked,
    required this.onTap,
    this.size = 22,
    this.inactiveColor,
  });

  final bool liked;
  final VoidCallback onTap;
  final double size;
  final Color? inactiveColor;

  @override
  State<FavoriteHeart> createState() => _FavoriteHeartState();
}

class _FavoriteHeartState extends State<FavoriteHeart> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 650),
  );
  late final Animation<double> _scale = TweenSequence<double>([
    TweenSequenceItem(tween: Tween(begin: 1, end: 1.4).chain(CurveTween(curve: Curves.easeOut)), weight: 25),
    TweenSequenceItem(tween: Tween(begin: 1.4, end: 0.9).chain(CurveTween(curve: Curves.easeIn)), weight: 20),
    TweenSequenceItem(tween: Tween(begin: 0.9, end: 1.22).chain(CurveTween(curve: Curves.easeOut)), weight: 25),
    TweenSequenceItem(tween: Tween(begin: 1.22, end: 1).chain(CurveTween(curve: Curves.easeIn)), weight: 30),
  ]).animate(_controller);

  @override
  void didUpdateWidget(FavoriteHeart oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.liked && !oldWidget.liked) {
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: ScaleTransition(
        scale: _scale,
        child: Icon(
          widget.liked ? Icons.favorite : Icons.favorite_border,
          color: widget.liked ? AppColors.favorite : widget.inactiveColor ?? Colors.white,
          size: widget.size,
        ),
      ),
    );
  }
}
