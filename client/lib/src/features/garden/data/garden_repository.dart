import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/demo/demo_mode_controller.dart';
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
    return const [
      GardenPlant(
        id: 'demo-pothos',
        currentStage: 'growing',
        nickname: '阳台上的绿萝',
        location: '客厅阳台',
        species: PlantSpeciesSummary(
          id: 'demo-species-pothos',
          name: '绿萝',
          scientificName: 'Epipremnum aureum',
          watering: '每周一次',
          sunlight: '明亮散射光',
        ),
      ),
      GardenPlant(
        id: 'demo-monstera',
        currentStage: 'growing',
        location: '书房窗边',
        species: PlantSpeciesSummary(
          id: 'demo-species-monstera',
          name: '龟背竹',
          scientificName: 'Monstera deliciosa',
          watering: '见干见湿',
          sunlight: '半阴环境',
        ),
      ),
      GardenPlant(
        id: 'demo-mint',
        currentStage: 'seedling',
        nickname: '薄荷小盆栽',
        location: '厨房窗台',
        species: PlantSpeciesSummary(
          id: 'demo-species-mint',
          name: '薄荷',
          scientificName: 'Mentha',
          watering: '保持湿润',
          sunlight: '充足日照',
        ),
      ),
    ];
  }

  return ref.watch(gardenRepositoryProvider).listPlants();
});
