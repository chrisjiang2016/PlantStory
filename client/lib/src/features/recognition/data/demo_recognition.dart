import 'recognition_models.dart';

final demoRecognitionResult = RecognitionResult(
  recognition: RecognitionRecord(
    id: 'demo-recognition-monstera',
    rawName: '龟背竹',
    confidence: 96,
    createdAt: DateTime(2026, 8, 19, 0),
  ),
  species: const RecognizedSpecies(
    id: 'demo-species-monstera',
    name: '龟背竹',
    scientificName: 'Monstera deliciosa',
    watering: '见干见湿',
    sunlight: '半阴环境',
    description: '叶片开裂优雅，适合放在明亮的散射光环境中。避免烈日直射，土壤表面干燥后再浇透水。',
  ),
  baikeInfo: const RecognitionBaikeInfo(
    description: 'Demo 使用本地示例识别结果，不会上传图片或调用外部 API。',
  ),
);
