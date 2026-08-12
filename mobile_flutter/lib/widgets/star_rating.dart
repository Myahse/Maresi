import 'package:flutter/material.dart';

class StarRating extends StatelessWidget {
  const StarRating({
    super.key,
    required this.value,
    this.size = 22,
    this.interactive = false,
    this.onChanged,
  });

  final double value;
  final double size;
  final bool interactive;
  final ValueChanged<int>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (index) {
        final starValue = index + 1;
        final filled = value >= starValue - 0.25;
        final icon = filled ? Icons.star : Icons.star_border;

        if (interactive && onChanged != null) {
          return IconButton(
            padding: EdgeInsets.zero,
            constraints: BoxConstraints(minWidth: size + 4, minHeight: size + 4),
            visualDensity: VisualDensity.compact,
            onPressed: () => onChanged!(starValue),
            icon: Icon(icon, size: size, color: Colors.amber),
          );
        }

        return Padding(
          padding: const EdgeInsets.only(right: 2),
          child: Icon(icon, size: size, color: Colors.amber),
        );
      }),
    );
  }
}

class StarRatingInput extends StatefulWidget {
  const StarRatingInput({super.key, required this.initialScore, required this.onChanged});

  final int initialScore;
  final ValueChanged<int> onChanged;

  @override
  State<StarRatingInput> createState() => _StarRatingInputState();
}

class _StarRatingInputState extends State<StarRatingInput> {
  late int _score = widget.initialScore;

  @override
  Widget build(BuildContext context) {
    return StarRating(
      value: _score.toDouble(),
      size: 32,
      interactive: true,
      onChanged: (score) {
        setState(() => _score = score);
        widget.onChanged(score);
      },
    );
  }
}
