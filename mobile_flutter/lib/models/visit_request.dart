class VisitRequestPayload {
  const VisitRequestPayload({
    required this.propertyId,
    required this.checkIn,
    required this.checkOut,
    required this.visitDate,
    required this.visitTime,
    required this.guestsCount,
    required this.contactPhone,
    required this.idCard,
    this.message,
  });

  final String propertyId;
  final String checkIn;
  final String checkOut;
  final String visitDate;
  final String visitTime;
  final int guestsCount;
  final String contactPhone;
  final String idCard;
  final String? message;

  Map<String, dynamic> toJson() => {
        'propertyId': propertyId,
        'check_in': checkIn,
        'check_out': checkOut,
        'visit_date': visitDate,
        'visit_time': visitTime,
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
    );
  }
}
