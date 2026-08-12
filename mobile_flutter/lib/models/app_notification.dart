import 'package:flutter/material.dart';

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.createdAt,
    required this.type,
    this.read = false,
    this.propertyId,
  });

  final String id;
  final String title;
  final String message;
  final DateTime createdAt;
  final String type;
  final bool read;
  final String? propertyId;

  IconData get icon => switch (type) {
        'reservation' => Icons.event_available_outlined,
        'listing' => Icons.home_work_outlined,
        'price' => Icons.trending_down,
        _ => Icons.notifications_outlined,
      };

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      message: json['message'] as String? ?? '',
      type: json['type'] as String? ?? 'general',
      propertyId: json['property_id'] as String?,
      read: json['read_at'] != null,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  AppNotification copyWith({bool? read}) {
    return AppNotification(
      id: id,
      title: title,
      message: message,
      createdAt: createdAt,
      type: type,
      read: read ?? this.read,
      propertyId: propertyId,
    );
  }
}
