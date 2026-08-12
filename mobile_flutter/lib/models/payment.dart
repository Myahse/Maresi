class Payment {
  const Payment({
    required this.id,
    required this.type,
    required this.amount,
    required this.status,
    this.visitRequestId,
    this.commissionAmount = 0,
    this.ownerAmount = 0,
    this.currency = 'XOF',
    this.checkoutUrl,
  });

  final String id;
  final String type;
  final double amount;
  final double commissionAmount;
  final double ownerAmount;
  final String currency;
  final String status;
  final String? visitRequestId;
  final String? checkoutUrl;

  factory Payment.fromJson(Map<String, dynamic> json) {
    return Payment(
      id: json['id'].toString(),
      type: json['type'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      commissionAmount: (json['commission_amount'] as num?)?.toDouble() ?? 0,
      ownerAmount: (json['owner_amount'] as num?)?.toDouble() ?? 0,
      currency: json['currency'] as String? ?? 'XOF',
      status: json['status'] as String? ?? 'pending',
      visitRequestId: json['visit_request_id']?.toString(),
      checkoutUrl: json['checkout_url'] as String?,
    );
  }
}

class OwnerSubscription {
  const OwnerSubscription({
    required this.status,
    required this.priceFcfa,
    required this.active,
    this.expiresAt,
  });

  final String status;
  final int priceFcfa;
  final bool active;
  final DateTime? expiresAt;

  factory OwnerSubscription.fromJson(Map<String, dynamic> json) {
    return OwnerSubscription(
      status: json['status'] as String? ?? 'inactive',
      priceFcfa: (json['price_fcfa'] as num?)?.toInt() ?? 10000,
      active: json['active'] == true,
      expiresAt: json['expires_at'] != null ? DateTime.tryParse(json['expires_at'].toString()) : null,
    );
  }
}
