import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/demo/demo_mode_controller.dart';
import 'demo_garden_controller.dart';
import 'garden_models.dart';

class GardenRepository {
  GardenRepository(this._api);

  final ApiClient _api;

  Future<List<GardenPlant>> listPlants() async {
    final json = await _api.getList('/garden/plants');
    return json
        .cast<Map<String, dynamic>>()
        .map(GardenPlant.fromJson)
        .toList(growable: false);
  }

  Future<GardenPlant> addPlant({
    required int speciesId,
    String? nickname,
    String? location,
  }) async {
    final json = await _api.postJson('/garden/plants', {
      'speciesId': speciesId,
      if (nickname?.isNotEmpty == true) 'nickname': nickname,
      if (location?.isNotEmpty == true) 'location': location,
    });
    return GardenPlant.fromJson(json);
  }
}

final gardenRepositoryProvider = Provider<GardenRepository>((ref) {
  return GardenRepository(ref.watch(apiClientProvider));
});

final gardenPlantsProvider = FutureProvider<List<GardenPlant>>((ref) async {
  if (ref.watch(demoModeProvider)) {
    return ref.watch(demoGardenProvider);
  }

  return ref.watch(gardenRepositoryProvider).listPlants();
});
