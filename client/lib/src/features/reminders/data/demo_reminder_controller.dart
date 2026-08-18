import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'reminder_models.dart';

class DemoReminderController extends StateNotifier<List<ReminderItem>> {
  DemoReminderController() : super(_defaultReminders);

  static const _storageKey = 'plant_story.demo_reminders';

  Future<void> restore() async {
    if (!kIsWeb) return;
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(_storageKey);
    if (raw == null || raw.isEmpty) return;

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return;
      state = decoded
          .whereType<Map<String, dynamic>>()
          .map(ReminderItem.fromJson)
          .toList(growable: false);
    } on FormatException {
      // Keep the sample reminders if browser storage is corrupted.
    }
  }

  Future<void> addReminder({
    required String plantId,
    required String plantName,
    required String careType,
    required DateTime remindAt,
  }) async {
    final title = switch (careType) {
      'water' => '给 $plantName 浇水',
      'fertilize' => '给 $plantName 施肥',
      'prune' => '修剪 $plantName',
      _ => '照顾 $plantName',
    };
    final item = ReminderItem(
      id: 'demo-reminder-${DateTime.now().microsecondsSinceEpoch}',
      title: title,
      careType: careType,
      remindAt: remindAt,
      repeatRule: '仅一次',
      myPlant: ReminderPlantSummary(id: plantId, nickname: plantName),
    );
    state = [...state, item];
    await _persist();
  }

  Future<void> complete(String id) async {
    state = state
        .where((reminder) => reminder.id != id)
        .toList(growable: false);
    await _persist();
  }

  Future<void> _persist() async {
    if (!kIsWeb) return;
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _storageKey,
      jsonEncode(state.map(_toJson).toList(growable: false)),
    );
  }

  Map<String, dynamic> _toJson(ReminderItem item) {
    return {
      'id': item.id,
      'title': item.title,
      'careType': item.careType,
      'remindAt': item.remindAt.toUtc().toIso8601String(),
      'repeatRule': item.repeatRule,
      'myPlant': item.myPlant == null
          ? null
          : {
              'id': item.myPlant!.id,
              'nickname': item.myPlant!.nickname,
              'speciesName': item.myPlant!.speciesName,
            },
    };
  }
}

final demoRemindersProvider =
    StateNotifierProvider<DemoReminderController, List<ReminderItem>>((ref) {
      return DemoReminderController();
    });

final _defaultReminders = <ReminderItem>[
  ReminderItem(
    id: 'demo-water-pothos',
    title: '给阳台上的绿萝浇水',
    careType: 'water',
    remindAt: DateTime(2026, 8, 18, 19),
    repeatRule: '每周一次',
    myPlant: const ReminderPlantSummary(
      id: 'demo-pothos',
      nickname: '阳台上的绿萝',
      speciesName: '绿萝',
    ),
  ),
  ReminderItem(
    id: 'demo-fertilize-monstera',
    title: '给龟背竹施肥',
    careType: 'fertilize',
    remindAt: DateTime(2026, 8, 19, 9),
    repeatRule: '每月一次',
    myPlant: const ReminderPlantSummary(
      id: 'demo-monstera',
      nickname: '龟背竹',
      speciesName: '龟背竹',
    ),
  ),
];
