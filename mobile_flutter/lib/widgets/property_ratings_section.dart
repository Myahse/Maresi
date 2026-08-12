import 'package:flutter/material.dart';
import 'package:maresi_mobile/models/property_rating.dart';
import 'package:maresi_mobile/providers/auth_provider.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/screens/login_screen.dart';
import 'package:maresi_mobile/services/maresi_client.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/theme/maresi_palette.dart';
import 'package:maresi_mobile/widgets/immo_widgets.dart';
import 'package:maresi_mobile/widgets/property_detail_section.dart';
import 'package:maresi_mobile/widgets/star_rating.dart';
import 'package:provider/provider.dart';

class PropertyRatingsSection extends StatefulWidget {
  const PropertyRatingsSection({
    super.key,
    required this.propertyId,
    this.initialAverage,
    this.initialCount,
    this.onStatsUpdated,
  });

  final String propertyId;
  final double? initialAverage;
  final int? initialCount;
  final void Function(double average, int count)? onStatsUpdated;

  @override
  State<PropertyRatingsSection> createState() => _PropertyRatingsSectionState();
}

class _PropertyRatingsSectionState extends State<PropertyRatingsSection> {
  List<PropertyRating> _ratings = [];
  RatingStats? _stats;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await maresiApi.getPropertyRatings(widget.propertyId);
      if (!mounted) return;
      setState(() {
        _ratings = result.ratings;
        _stats = result.statistics;
        _loading = false;
      });
      widget.onStatsUpdated?.call(result.statistics.average, result.statistics.count);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _openReviewSheet() async {
    final locale = context.read<LocaleProvider>();
    if (!context.read<AuthProvider>().isAuthenticated) {
      final loggedIn = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => const LoginScreen(popOnSuccess: true)),
      );
      if (!mounted || loggedIn != true) return;
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetContext) => _WriteReviewSheet(
        propertyId: widget.propertyId,
        locale: locale,
        onSubmitted: () async {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(locale.t('ratings.thanks'))),
          );
          await _load();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final palette = context.palette;
    final average = _stats?.average ?? widget.initialAverage ?? 0;
    final count = _stats?.count ?? widget.initialCount ?? 0;

    return PropertyDetailSection(
      title: locale.t('ratings.title'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    StarRating(value: average, size: 18),
                    const SizedBox(height: 6),
                    Text(
                      locale.t('ratings.count').replaceAll('{{count}}', '$count'),
                      style: TextStyle(fontSize: 13, color: palette.textSecondary),
                    ),
                  ],
                ),
              ),
              OutlinedButton(
                onPressed: _openReviewSheet,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                ),
                child: Text(locale.t('ratings.writeReview')),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_loading)
            const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(color: AppColors.primary)))
          else if (_error != null)
            Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 13))
          else if (_ratings.isEmpty)
            Text(locale.t('ratings.empty'), style: TextStyle(fontSize: 14, color: palette.textSecondary, height: 1.4))
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _ratings.length,
              separatorBuilder: (_, __) => Divider(height: 24, color: palette.menuBorder),
              itemBuilder: (context, index) {
                final review = _ratings[index];
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            review.userName,
                            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: palette.text),
                          ),
                        ),
                        StarRating(value: review.score.toDouble(), size: 16),
                      ],
                    ),
                    if (review.comment != null && review.comment!.trim().isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        review.comment!,
                        style: TextStyle(fontSize: 14, color: palette.textSecondary, height: 1.45),
                      ),
                    ],
                  ],
                );
              },
            ),
        ],
      ),
    );
  }
}

class _WriteReviewSheet extends StatefulWidget {
  const _WriteReviewSheet({
    required this.propertyId,
    required this.locale,
    required this.onSubmitted,
  });

  final String propertyId;
  final LocaleProvider locale;
  final Future<void> Function() onSubmitted;

  @override
  State<_WriteReviewSheet> createState() => _WriteReviewSheetState();
}

class _WriteReviewSheetState extends State<_WriteReviewSheet> {
  final _commentController = TextEditingController();
  int _score = 5;
  bool _submitting = false;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      await maresiApi.submitPropertyRating(
        widget.propertyId,
        SubmitRatingPayload(score: _score, comment: _commentController.text),
      );
      if (!mounted) return;
      Navigator.of(context).pop();
      await widget.onSubmitted();
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(widget.locale.t('ratings.submitFailed'))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.only(left: 24, right: 24, top: 20, bottom: bottomInset + 24),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.locale.t('ratings.writeReview'),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              widget.locale.t('ratings.yourRating'),
              style: TextStyle(color: context.palette.textSecondary),
            ),
            const SizedBox(height: 8),
            StarRatingInput(
              initialScore: _score,
              onChanged: (value) => setState(() => _score = value),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _commentController,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: widget.locale.t('ratings.comment'),
                hintText: widget.locale.t('ratings.commentPlaceholder'),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 20),
            ImmoGradientButton(
              label: _submitting ? widget.locale.t('ratings.submitting') : widget.locale.t('ratings.submit'),
              loading: _submitting,
              width: double.infinity,
              onPressed: _submitting ? null : _submit,
            ),
          ],
        ),
      ),
    );
  }
}
