class PlantSpeciesSummary {
  const PlantSpeciesSummary({
    required this.id,
    required this.name,
    this.scientificName,
    this.imageUrl,
    this.watering,
    this.sunlight,
  });

  final String id;
  final String name;
  final String? scientificName;
  final String? imageUrl;
  final String? watering;
  final String? sunlight;

  factory PlantSpeciesSummary.fromJson(Map<String, dynamic> json) {
    return PlantSpeciesSummary(
      id: json['id'].toString(),
      name: json['name'] as String,
      scientificName: json['scientificName'] as String?,
      imageUrl: json['imageUrl'] as String?,
      watering: json['watering'] as String?,
      sunlight: json['sunlight'] as String?,
    );
  }
}

class GardenPlant {
  const GardenPlant({
    required this.id,
    required this.currentStage,
    required this.species,
    this.nickname,
    this.location,
    this.photoUrl,
  });

  final String id;
  final String currentStage;
  final PlantSpeciesSummary species;
  final String? nickname;
  final String? location;
  final String? photoUrl;

  String get displayName => nickname?.isNotEmpty == true ? nickname! : species.name;

  factory GardenPlant.fromJson(Map<String, dynamic> json) {
    return GardenPlant(
      id: json['id'].toString(),
      currentStage: json['currentStage'] as String? ?? 'seed',
      species: PlantSpeciesSummary.fromJson(json['species'] as Map<String, dynamic>),
      nickname: json['nickname'] as String?,
      location: json['location'] as String?,
      photoUrl: json['photoUrl'] as String?,
    );
  }
}
