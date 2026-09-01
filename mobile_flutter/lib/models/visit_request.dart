class VisitRequestPayload {
  const VisitRequestPayload({
    required this.propertyId,
    required this.checkIn,
    required this.checkOut,
    this.visitDate,
    this.visitTime,
    required this.guestsCount,
    required this.contactPhone,
    required this.idCard,
    this.message,
  });

  final String propertyId;
  final String checkIn;
  final String checkOut;
  final String? visitDate;
  final String? visitTime;
  final int guestsCount;
  final String contactPhone;
  final String idCard;
  final String? message;

  Map<String, dynamic> toJson() => {
        'propertyId': propertyId,
        'check_in': checkIn,
        'check_out': checkOut,
        if (visitDate != null && visitDate!.isNotEmpty) 'visit_date': visitDate,
        if (visitTime != null && visitTime!.isNotEmpty) 'visit_time': visitTime,
        'guests_count': guestsCount,
        'contact_phone': contactPhone,
        'id_card': idCard,
        if (message != null && message!.trim().isNotEmpty) 'message': message!.trim(),
      };
}

class VisitRequest {
  const VisitRequest({
    required this.id,
    required this.propertyId,
    required this.status,
    required this.checkIn,
    required this.checkOut,
    required this.visitDate,
    required this.visitTime,
    this.guestsCount,
    this.contactPhone,
    this.idCard,
    this.message,
    this.propertyTitle,
    this.location,
    this.propertyPrice,
    this.wavePaymentUrl,
    this.orangeMoneyUrl,
    this.ownerPhone,
    this.keyCode,
    this.extensionCheckOut,
    this.extensionStatus,
    this.extensionAmount,
    this.extensionNote,
    this.overstay = false,
    this.closedAt,
  });

  final String id;
  final String propertyId;
  final String status;
  final String checkIn;
  final String checkOut;
  final String visitDate;
  final String visitTime;
  final int? guestsCount;
  final String? contactPhone;
  final String? idCard;
  final String? message;
  final String? propertyTitle;
  final String? location;
  final num? propertyPrice;
  final String? wavePaymentUrl;
  final String? orangeMoneyUrl;
  final String? ownerPhone;
  final String? keyCode;
  final String? extensionCheckOut;
  final String? extensionStatus;
  final num? extensionAmount;
  final String? extensionNote;
  final bool overstay;
  final String? closedAt;

  factory VisitRequest.fromJson(Map<String, dynamic> json) {
    return VisitRequest(
      id: json['id'].toString(),
      propertyId: json['property_id']?.toString() ?? json['propertyId']?.toString() ?? '',
      status: json['status'] as String? ?? 'pending',
      checkIn: json['check_in'] as String? ?? '',
      checkOut: json['check_out'] as String? ?? '',
      visitDate: json['visit_date'] as String? ?? '',
      visitTime: json['visit_time'] as String? ?? '',
      guestsCount: (json['guests_count'] as num?)?.toInt(),
      contactPhone: json['contact_phone'] as String?,
      idCard: json['id_card'] as String?,
      message: json['message'] as String?,
      propertyTitle: json['property_title'] as String? ?? json['propertyTitle'] as String?,
      location: json['location'] as String?,
      propertyPrice: json['property_price'] as num?,
      wavePaymentUrl: json['wave_payment_url'] as String?,
      orangeMoneyUrl: json['orange_money_url'] as String?,
      ownerPhone: json['owner_phone'] as String?,
      keyCode: json['key_code'] as String?,
      extensionCheckOut: json['extension_check_out'] as String?,
      extensionStatus: json['extension_status'] as String?,
      extensionAmount: json['extension_amount'] as num?,
      extensionNote: json['extension_note'] as String?,
      overstay: json['overstay'] == true,
      closedAt: json['closed_at'] as String?,
    );
  }
}
