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

  /// Operator fees from GeniusPay pricing (CI): Wave direct 1.5%; Orange / MTN / Moov via PawaPay or PAL ~3.5%.
  static const List<PaymentMethod> all = [
    PaymentMethod(
      id: 'wave',
      name: 'Wave',
      operatorFeePercent: 1.5,
      description: 'Frais opérateur 1.5%',
    ),
    PaymentMethod(
      id: 'orange_money',
      name: 'Orange Money',
      operatorFeePercent: 3.5,
      description: 'Frais opérateur 3.5%',
    ),
    PaymentMethod(
      id: 'mtn_money',
      name: 'MTN Money',
      operatorFeePercent: 3.5,
      description: 'Frais opérateur 3.5%',
    ),
    PaymentMethod(
      id: 'moov_money',
      name: 'Moov Money',
      operatorFeePercent: 3.5,
      description: 'Frais opérateur 3.5%',
    ),
  ];
}

class PaymentBreakdown {
  const PaymentBreakdown({
    required this.total,
    required this.operatorFee,
  });

  final int total;
  final int operatorFee;
}

PaymentBreakdown calculateTotalAmount(int baseAmount, PaymentMethod method, bool clientPaysFees) {
  if (!clientPaysFees) {
    return PaymentBreakdown(total: baseAmount, operatorFee: 0);
  }
  final operatorFee = (baseAmount * method.operatorFeePercent / 100).ceil();
  return PaymentBreakdown(
    total: baseAmount + operatorFee,
    operatorFee: operatorFee,
  );
}
