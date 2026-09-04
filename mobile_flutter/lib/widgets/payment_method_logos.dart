import 'package:flutter/material.dart';

class WaveLogo extends StatelessWidget {
  const WaveLogo({super.key, this.size = 24, this.color = Colors.white});
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _WavePainter(color: color)),
    );
  }
}

class _WavePainter extends CustomPainter {
  _WavePainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width * 0.35;
    canvas.drawCircle(center, radius, paint);
    
    final innerPaint = Paint()..color = Colors.white;
    canvas.drawCircle(center, radius * 0.6, innerPaint);
    
    final wavePaint = Paint()..color = const Color(0xFF00B8D9);
    canvas.drawCircle(center, radius * 0.3, wavePaint);
    
    final dotPaint = Paint()..color = Colors.white;
    canvas.drawCircle(center, radius * 0.15, dotPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class OrangeMoneyLogo extends StatelessWidget {
  const OrangeMoneyLogo({super.key, this.size = 24, this.color = Colors.white});
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _OrangeMoneyPainter(color: color)),
    );
  }
}

class _OrangeMoneyPainter extends CustomPainter {
  _OrangeMoneyPainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width * 0.4;
    canvas.drawCircle(center, radius, paint);
    
    final innerPaint = Paint()..color = Colors.white;
    canvas.drawCircle(center, radius * 0.7, innerPaint);
    
    final arrowPaint = Paint()
      ..color = const Color(0xFFFF6F00)
      ..strokeWidth = size.width * 0.1
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    
    final path = Path();
    final startY = size.height * 0.55;
    path.moveTo(size.width * 0.3, startY);
    path.lineTo(size.width * 0.5, startY - size.height * 0.2);
    path.lineTo(size.width * 0.7, startY);
    canvas.drawPath(path, arrowPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class MTNMoneyLogo extends StatelessWidget {
  const MTNMoneyLogo({super.key, this.size = 24, this.color = Colors.white});
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _MTNMoneyPainter(color: color)),
    );
  }
}

class _MTNMoneyPainter extends CustomPainter {
  _MTNMoneyPainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width * 0.4;
    canvas.drawCircle(center, radius, paint);
    
    final crossPaint = Paint()
      ..color = Colors.black
      ..strokeWidth = size.width * 0.12
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    
    canvas.drawLine(
      Offset(size.width * 0.3, size.height * 0.3),
      Offset(size.width * 0.7, size.height * 0.7),
      crossPaint,
    );
    canvas.drawLine(
      Offset(size.width * 0.7, size.height * 0.3),
      Offset(size.width * 0.3, size.height * 0.7),
      crossPaint,
    );
    
    final circlePaint = Paint()..color = Colors.white;
    canvas.drawCircle(center, radius * 0.4, circlePaint);
    
    final plusPaint = Paint()
      ..color = Colors.black
      ..strokeWidth = size.width * 0.08
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    
    canvas.drawLine(
      Offset(center.dx, center.dy - size.height * 0.15),
      Offset(center.dx, center.dy + size.height * 0.15),
      plusPaint,
    );
    canvas.drawLine(
      Offset(center.dx - size.width * 0.15, center.dy),
      Offset(center.dx + size.width * 0.15, center.dy),
      plusPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class MoovMoneyLogo extends StatelessWidget {
  const MoovMoneyLogo({super.key, this.size = 24, this.color = Colors.white});
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _MoovMoneyPainter(color: color)),
    );
  }
}

class _MoovMoneyPainter extends CustomPainter {
  _MoovMoneyPainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width * 0.4;
    canvas.drawCircle(center, radius, paint);
    
    final innerPaint = Paint()..color = Colors.white;
    canvas.drawCircle(center, radius * 0.7, innerPaint);
    
    final arrowPaint = Paint()
      ..color = const Color(0xFF007BFF)
      ..strokeWidth = size.width * 0.1
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    
    final path = Path();
    final startY = size.height * 0.55;
    path.moveTo(size.width * 0.3, startY);
    path.lineTo(size.width * 0.5, startY - size.height * 0.2);
    path.lineTo(size.width * 0.7, startY);
    canvas.drawPath(path, arrowPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

Widget getPaymentMethodLogo(String id, {double size = 24, Color color = Colors.white}) {
  switch (id) {
    case 'wave':
      return WaveLogo(size: size, color: color);
    case 'orange_money':
      return OrangeMoneyLogo(size: size, color: color);
    case 'mtn_money':
      return MTNMoneyLogo(size: size, color: color);
    case 'moov_money':
      return MoovMoneyLogo(size: size, color: color);
    default:
      return WaveLogo(size: size, color: color);
  }
}