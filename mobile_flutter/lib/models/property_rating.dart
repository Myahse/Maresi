class PropertyRating {
  const PropertyRating({
    required this.id,
    required this.propertyId,
    required this.userId,
    required this.userName,
    required this.score,
    required this.createdAt,
    this.comment,
  });

  final String id;
  final String propertyId;
  final String userId;
  final String userName;
  final int score;
  final String? comment;
  final DateTime createdAt;

  factory PropertyRating.fromJson(Map<String, dynamic> json) {
    return PropertyRating(
      id: json['id'].toString(),
      propertyId: json['property_id']?.toString() ?? json['propertyId']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? json['userId']?.toString() ?? '',
      userName: json['user_name'] as String? ?? json['userName'] as String? ?? 'Client',
      score: (json['score'] as num?)?.toInt() ?? 0,
      comment: json['comment'] as String?,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? json['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

class RatingStats {
  const RatingStats({required this.average, required this.count});

  final double average;
  final int count;

  factory RatingStats.fromJson(Map<String, dynamic> json) {
    return RatingStats(
      average: (json['average'] as num?)?.toDouble() ?? 0,
      count: (json['count'] as num?)?.toInt() ?? 0,
    );
  }

  factory RatingStats.fromRatings(List<PropertyRating> ratings) {
    if (ratings.isEmpty) return const RatingStats(average: 0, count: 0);
    final sum = ratings.fold<int>(0, (total, r) => total + r.score);
    return RatingStats(average: sum / ratings.length, count: ratings.length);
  }
}

class PropertyRatingsResult {
  const PropertyRatingsResult({required this.ratings, required this.statistics});

  final List<PropertyRating> ratings;
  final RatingStats statistics;
}

class SubmitRatingPayload {
  const SubmitRatingPayload({required this.score, this.comment});

  final int score;
  final String? comment;

  Map<String, dynamic> toJson() => {
        'score': score,
        if (comment != null && comment!.trim().isNotEmpty) 'comment': comment!.trim(),
      };
}
