import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class PropertyPhotoViewer extends StatefulWidget {
  const PropertyPhotoViewer({
    super.key,
    required this.images,
    required this.initialIndex,
    this.noImageLabel = "Pas d'image",
  });

  final List<String> images;
  final int initialIndex;
  final String noImageLabel;

  static Future<void> open(
    BuildContext context, {
    required List<String> images,
    required int initialIndex,
    String noImageLabel = "Pas d'image",
  }) {
    if (images.isEmpty) return Future.value();
    return Navigator.of(context).push<void>(
      PageRouteBuilder<void>(
        opaque: false,
        barrierColor: Colors.black,
        pageBuilder: (context, animation, secondaryAnimation) {
          return FadeTransition(
            opacity: animation,
            child: PropertyPhotoViewer(
              images: images,
              initialIndex: initialIndex.clamp(0, images.length - 1),
              noImageLabel: noImageLabel,
            ),
          );
        },
      ),
    );
  }

  @override
  State<PropertyPhotoViewer> createState() => _PropertyPhotoViewerState();
}

class _PropertyPhotoViewerState extends State<PropertyPhotoViewer> {
  late final PageController _controller = PageController(initialPage: widget.initialIndex);
  late int _index = widget.initialIndex;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.paddingOf(context).top;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            PageView.builder(
              controller: _controller,
              itemCount: widget.images.length,
              onPageChanged: (index) => setState(() => _index = index),
              itemBuilder: (context, index) {
                return InteractiveViewer(
                  minScale: 1,
                  maxScale: 4,
                  child: Center(
                    child: Image.network(
                      widget.images[index],
                      fit: BoxFit.contain,
                      width: double.infinity,
                      height: double.infinity,
                      errorBuilder: (context, error, stackTrace) => Text(
                        widget.noImageLabel,
                        style: const TextStyle(color: Colors.white70),
                      ),
                    ),
                  ),
                );
              },
            ),
            Positioned(
              top: topPadding + 8,
              left: 8,
              child: IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close, color: Colors.white, size: 28),
              ),
            ),
            if (widget.images.length > 1)
              Positioned(
                top: topPadding + 16,
                left: 0,
                right: 0,
                child: Text(
                  '${_index + 1} / ${widget.images.length}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
