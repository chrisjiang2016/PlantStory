import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import 'reminder_models.dart';

class RemindersRepository {
  RemindersRepository(this._api);

  final ApiClient _api;

  Future<List<ReminderItem>> listPending({bool todayOnly = false}) async {
    final json = await _api.getList('/reminders', query: {
      if (todayOnly) 'today': true,
    });
    return json
        .cast<Map<String, dynamic>>()
        .map(ReminderItem.fromJson)
        .toList(growable: false);
  }

  Future<void> complete(String id) async {
    await _api.patchJson('/reminders/$id/complete', const {});
  }
}

final remindersRepositoryProvider = Provider<RemindersRepository>((ref) {
  return RemindersRepository(ref.watch(apiClientProvider));
});

final pendingRemindersProvider = FutureProvider<List<ReminderItem>>((ref) async {
  return ref.watch(remindersRepositoryProvider).listPending();
});
