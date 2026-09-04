class PaymentMethod {
  const PaymentMethod({
    required this.id,
    required this.name,
    required this.operatorFeePercent,
    required this.description,
  });

  final String id;
  final String name;
  final double operatorFeePercent;
  final String description;

  static const List<PaymentMethod> all = [
    PaymentMethod(
      id: 'wave',
      name: 'Wave',
      operatorFeePercent: 1.5,
      description: 'Frais opérateur 1.5% + GeniusPay 1% + 100 XOF',
    ),
    PaymentMethod(
      id: 'orange_money',
      name: 'Orange Money',
      operatorFeePercent: 1.5,
      description: 'Frais opérateur 1.5% + GeniusPay 1% + 100 XOF',
    ),
    PaymentMethod(
      id: 'mtn_money',
      name: 'MTN Money',
      operatorFeePercent: 1.5,
      description: 'Frais opérateur 1.5% + GeniusPay 1% + 100 XOF',
    ),
    PaymentMethod(
      id: 'moov_money',
      name: 'Moov Money',
      operatorFeePercent: 1.5,
      description: 'Frais opérateur 1.5% + GeniusPay 1% + 100 XOF',
    ),
  ];
}

const double kGeniusPayFeePercent = 1.0;
const int kGeniusPayFixedFee = 100;

class PaymentBreakdown {
  const PaymentBreakdown({
    required this.total,
    required this.operatorFee,
    required this.geniusPayFee,
  });

  final int total;
  final int operatorFee;
  final int geniusPayFee;
}

PaymentBreakdown calculateTotalAmount(int baseAmount, PaymentMethod method, bool clientPaysFees) {
  if (!clientPaysFees) {
    return PaymentBreakdown(total: baseAmount, operatorFee: 0, geniusPayFee: 0);
  }
  final operatorFee = (baseAmount * method.operatorFeePercent / 100).ceil();
  final geniusPayFee = (baseAmount * kGeniusPayFeePercent / 100).ceil() + kGeniusPayFixedFee;
  return PaymentBreakdown(
    total: baseAmount + operatorFee + geniusPayFee,
    operatorFee: operatorFee,
    geniusPayFee: geniusPayFee,
  );
}