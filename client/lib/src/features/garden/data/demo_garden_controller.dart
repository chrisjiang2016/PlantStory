import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'garden_models.dart';

class DemoGardenController extends StateNotifier<List<GardenPlant>> {
  DemoGardenController() : super(_defaultPlants);

  static const _storageKey = 'plant_story.demo_garden_plants';

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
          .map(GardenPlant.fromJson)
          .toList(growable: false);
    } on FormatException {
      // Ignore corrupted demo data and keep the built-in sample garden.
    }
  }

  Future<void> addPlant({
    required String name,
    String? nickname,
    String? location,
  }) async {
    final plant = GardenPlant(
      id: 'demo-${DateTime.now().microsecondsSinceEpoch}',
      currentStage: 'seedling',
      nickname: nickname?.trim().isEmpty == true ? null : nickname?.trim(),
      location: location?.trim().isEmpty == true ? null : location?.trim(),
      species: PlantSpeciesSummary(
        id: 'demo-species-${DateTime.now().microsecondsSinceEpoch}',
        name: name.trim(),
        watering: '每周一次',
        sunlight: '明亮散射光',
      ),
    );
    state = [...state, plant];
    await _persist();
  }

  Future<void> removePlant(String id) async {
    state = state.where((plant) => plant.id != id).toList(growable: false);
    await _persist();
  }

  Future<void> _persist() async {
    if (!kIsWeb) return;
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _storageKey,
      jsonEncode(state.map(_plantToJson).toList(growable: false)),
    );
  }

  Map<String, dynamic> _plantToJson(GardenPlant plant) {
    return {
      'id': plant.id,
      'currentStage': plant.currentStage,
      'nickname': plant.nickname,
      'location': plant.location,
      'photoUrl': plant.photoUrl,
      'species': {
        'id': plant.species.id,
        'name': plant.species.name,
        'scientificName': plant.species.scientificName,
        'imageUrl': plant.species.imageUrl,
        'watering': plant.species.watering,
        'sunlight': plant.species.sunlight,
      },
    };
  }
}

final demoGardenProvider = StateNotifierProvider<DemoGardenController, List<GardenPlant>>((ref) {
  return DemoGardenController();
});

const _defaultPlants = <GardenPlant>[
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
