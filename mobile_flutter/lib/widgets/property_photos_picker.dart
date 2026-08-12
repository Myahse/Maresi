import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:maresi_mobile/providers/locale_provider.dart';
import 'package:maresi_mobile/theme/app_colors.dart';
import 'package:maresi_mobile/utils/property_photos.dart';

class PropertyPhotosPicker extends StatelessWidget {
  const PropertyPhotosPicker({
    super.key,
    required this.photos,
    required this.onChanged,
    required this.enabled,
    required this.locale,
  });

  final List<XFile> photos;
  final ValueChanged<List<XFile>> onChanged;
  final bool enabled;
  final LocaleProvider locale;

  Future<void> _pickPhotos() async {
    if (!enabled) return;
    final picker = ImagePicker();
    final picked = await picker.pickMultiImage(imageQuality: 85);
    if (picked.isEmpty) return;
    onChanged([...photos, ...picked]);
  }

  void _removeAt(int index) {
    if (!enabled) return;
    final next = [...photos]..removeAt(index);
    onChanged(next);
  }

  @override
  Widget build(BuildContext context) {
    final count = photos.length;
    final metMinimum = count >= kMinPropertyPhotos;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                locale
                    .t('propertyCreate.photosProgress')
                    .replaceAll('{{count}}', '$count')
                    .replaceAll('{{min}}', '$kMinPropertyPhotos'),
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: metMinimum ? const Color(0xFF059669) : const Color(0xFF6B7280),
                ),
              ),
            ),
            if (!metMinimum)
              Text(
                locale
                    .t('propertyCreate.photosRemaining')
                    .replaceAll('{{remaining}}', '${kMinPropertyPhotos - count}'),
                style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626)),
              ),
          ],
        ),
        const SizedBox(height: 12),
        if (photos.isNotEmpty)
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: photos.length,
            itemBuilder: (context, index) {
              final file = photos[index];
              return Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: _PhotoThumb(file: file),
                  ),
                  if (enabled)
                    Positioned(
                      top: 4,
                      right: 4,
                      child: Material(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => _removeAt(index),
                          child: const Padding(
                            padding: EdgeInsets.all(2),
                            child: Icon(Icons.close, size: 16, color: Colors.white),
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: enabled ? _pickPhotos : null,
          icon: const Icon(Icons.add_photo_alternate_outlined),
          label: Text(locale.t('propertyCreate.addPhotos')),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primary,
            side: BorderSide(color: AppColors.primary.withValues(alpha: 0.4)),
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
        ),
      ],
    );
  }
}

class _PhotoThumb extends StatelessWidget {
  const _PhotoThumb({required this.file});

  final XFile file;

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      return Image.network(file.path, fit: BoxFit.cover);
    }
    return Image.file(File(file.path), fit: BoxFit.cover);
  }
}
