import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class OfflineQueuedException implements Exception {
  @override
  String toString() => 'OFFLINE_QUEUED';
}

class QueuedRequest {
  const QueuedRequest({
    required this.id,
    required this.method,
    required this.path,
    this.body,
  });

  final String id;
  final String method;
  final String path;
  final String? body;

  Map<String, dynamic> toJson() => {
        'id': id,
        'method': method,
        'path': path,
        'body': body,
      };

  factory QueuedRequest.fromJson(Map<String, dynamic> json) {
    return QueuedRequest(
      id: json['id'] as String,
      method: json['method'] as String,
      path: json['path'] as String,
      body: json['body'] as String?,
    );
  }
}

class OfflineStore extends ChangeNotifier {
  OfflineStore._();
  static final OfflineStore instance = OfflineStore._();

  static const _cachePrefix = 'maresi_offline_cache:';
  static const _queueKey = 'maresi_offline_queue';

  bool _online = true;
  int _pending = 0;
  bool _flushing = false;
  Timer? _retryTimer;

  Future<void> Function(QueuedRequest)? sender;

  bool get online => _online;
  int get pending => _pending;

  bool isOfflineQueued(Object error) =>
      error is OfflineQueuedException || error.toString().contains('OFFLINE_QUEUED');

  Future<SharedPreferences> get _prefs => SharedPreferences.getInstance();

  String _cacheKey(String path) => '$_cachePrefix$path';

  void markOnline() {
    if (_online) return;
    _online = true;
    notifyListeners();
  }

  void markOffline() {
    if (!_online) return;
    _online = false;
    notifyListeners();
    _scheduleRetry();
  }

  void _scheduleRetry() {
    _retryTimer?.cancel();
    _retryTimer = Timer.periodic(const Duration(seconds: 12), (_) {
      unawaited(flush());
    });
  }

  Future<dynamic> readCache(String path) async {
    final prefs = await _prefs;
    final raw = prefs.getString(_cacheKey(path));
    if (raw == null) return null;
    try {
      return jsonDecode(raw);
    } catch (_) {
      return null;
    }
  }

  Future<void> writeCache(String path, dynamic value) async {
    final prefs = await _prefs;
    await prefs.setString(_cacheKey(path), jsonEncode(value));
  }

  Future<void> enqueue({required String method, required String path, String? body}) async {
    final prefs = await _prefs;
    final queue = await _readQueue(prefs);
    queue.add(
      QueuedRequest(
        id: '${DateTime.now().millisecondsSinceEpoch}',
        method: method,
        path: path,
        body: body,
      ),
    );
    await prefs.setString(_queueKey, jsonEncode(queue.map((e) => e.toJson()).toList()));
    _pending = queue.length;
    markOffline();
    notifyListeners();
    _scheduleRetry();
  }

  Future<List<QueuedRequest>> _readQueue(SharedPreferences prefs) async {
    final raw = prefs.getString(_queueKey);
    if (raw == null) return [];
    try {
      return (jsonDecode(raw) as List)
          .map((e) => QueuedRequest.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> flush() async {
    final send = sender;
    if (send == null || _flushing) return;
    _flushing = true;
    try {
      final prefs = await _prefs;
      final queue = await _readQueue(prefs);
      final remaining = <QueuedRequest>[];
      var failed = false;
      for (final item in queue) {
        if (failed) {
          remaining.add(item);
          continue;
        }
        try {
          await send(item);
        } catch (_) {
          remaining.add(item);
          failed = true;
        }
      }
      await prefs.setString(_queueKey, jsonEncode(remaining.map((e) => e.toJson()).toList()));
      _pending = remaining.length;
      if (!failed) {
        _retryTimer?.cancel();
        _retryTimer = null;
        if (!_online) _online = true;
      }
      notifyListeners();
    } finally {
      _flushing = false;
    }
  }

  Future<void> clearSession() async {
    final prefs = await _prefs;
    final keys = prefs.getKeys().where((k) => k.startsWith(_cachePrefix) || k == _queueKey).toList();
    for (final key in keys) {
      await prefs.remove(key);
    }
    _pending = 0;
    notifyListeners();
  }
}
