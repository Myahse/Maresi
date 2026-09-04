import 'package:flutter/material.dart';

class _LogoTile extends StatelessWidget {
  const _LogoTile({required this.asset, required this.size});

  final String asset;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(size * 0.25),
        child: Image.asset(
          asset,
          width: size,
          height: size,
          fit: BoxFit.cover,
        ),
      ),
    );
  }
}

class WaveLogo extends StatelessWidget {
  const WaveLogo({super.key, this.size = 24, this.color = Colors.white});
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return _LogoTile(asset: 'assets/payment/wave.png', size: size);
  }
}

class OrangeMoneyLogo extends StatelessWidget {
  const OrangeMoneyLogo({super.key, this.size = 24, this.color = Colors.white});
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return _LogoTile(asset: 'assets/payment/orange-money.png', size: size);
  }
}

class MTNMoneyLogo extends StatelessWidget {
  const MTNMoneyLogo({super.key, this.size = 24, this.color = Colors.white});
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return _LogoTile(asset: 'assets/payment/mtn-money.png', size: size);
  }
}

class MoovMoneyLogo extends StatelessWidget {
  const MoovMoneyLogo({super.key, this.size = 24, this.color = Colors.white});
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return _LogoTile(asset: 'assets/payment/moov-money.png', size: size);
  }
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
