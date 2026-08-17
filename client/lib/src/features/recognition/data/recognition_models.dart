class RecognitionRecord {
  const RecognitionRecord({
    required this.id,
    required this.rawName,
    required this.confidence,
    required this.createdAt,
    this.imageUrl,
  });

  final String id;
  final String rawName;
  final int confidence;
  final DateTime createdAt;
  final String? imageUrl;

  factory RecognitionRecord.fromJson(Map<String, dynamic> json) {
    return RecognitionRecord(
      id: json['id'].toString(),
      rawName: json['rawName'] as String? ?? '未知植物',
      confidence: (json['confidence'] as num?)?.round() ?? 0,
      imageUrl: json['imageUrl'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class RecognizedSpecies {
  const RecognizedSpecies({
    required this.id,
    required this.name,
    this.scientificName,
    this.family,
    this.genus,
    this.watering,
    this.sunlight,
    this.description,
    this.imageUrl,
    this.careGuide,
  });

  final String id;
  final String name;
  final String? scientificName;
  final String? family;
  final String? genus;
  final String? watering;
  final String? sunlight;
  final String? description;
  final String? imageUrl;
  final Map<String, dynamic>? careGuide;

  factory RecognizedSpecies.fromJson(Map<String, dynamic> json) {
    return RecognizedSpecies(
      id: json['id'].toString(),
      name: json['name'] as String? ?? '未知植物',
      scientificName: json['scientificName'] as String?,
      family: json['family'] as String?,
      genus: json['genus'] as String?,
      watering: json['watering'] as String?,
      sunlight: json['sunlight'] as String?,
      description: json['description'] as String?,
      imageUrl: json['imageUrl'] as String?,
      careGuide: json['careGuide'] is Map<String, dynamic>
          ? json['careGuide'] as Map<String, dynamic>
          : null,
    );
  }
}

class RecognitionBaikeInfo {
  const RecognitionBaikeInfo({this.imageUrl, this.description});

  final String? imageUrl;
  final String? description;

  factory RecognitionBaikeInfo.fromJson(Map<String, dynamic> json) {
    return RecognitionBaikeInfo(
      imageUrl: json['imageUrl'] as String?,
      description: json['description'] as String?,
    );
  }
}

class RecognitionResult {
  const RecognitionResult({
    required this.recognition,
    this.species,
    this.baikeInfo,
  });

  final RecognitionRecord recognition;
  final RecognizedSpecies? species;
  final RecognitionBaikeInfo? baikeInfo;

  String get displayName => species?.name ?? recognition.rawName;
  String? get imageUrl =>
      species?.imageUrl ?? baikeInfo?.imageUrl ?? recognition.imageUrl;
  String? get description => species?.description ?? baikeInfo?.description;

  factory RecognitionResult.fromJson(Map<String, dynamic> json) {
    final speciesJson = json['species'];
    final baikeJson = json['baikeInfo'];
    return RecognitionResult(
      recognition: RecognitionRecord.fromJson(
        json['recognition'] as Map<String, dynamic>,
      ),
      species: speciesJson is Map<String, dynamic>
          ? RecognizedSpecies.fromJson(speciesJson)
          : null,
      baikeInfo: baikeJson is Map<String, dynamic>
          ? RecognitionBaikeInfo.fromJson(baikeJson)
          : null,
    );
  }
}
