import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import 'recognition_models.dart';

class RecognitionRepository {
  RecognitionRepository(this._api);

  final ApiClient _api;

  Future<RecognitionResult> identifyPlant(String imageBase64) async {
    final json = await _api.postJson('/recognition/identify', {
      'imageBase64': imageBase64,
    });
    return RecognitionResult.fromJson(json);
  }
}

final recognitionRepositoryProvider = Provider<RecognitionRepository>((ref) {
  return RecognitionRepository(ref.watch(apiClientProvider));
});
