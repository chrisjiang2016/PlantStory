import 'package:flutter_test/flutter_test.dart';

import 'package:plant_story/src/features/garden/data/demo_garden_controller.dart';
import 'package:plant_story/src/features/recognition/data/demo_recognition.dart';
import 'package:plant_story/src/features/reminders/data/demo_reminder_controller.dart';

void main() {
  test('demo recognition result is self-contained and does not need API data', () {
    expect(demoRecognitionResult.displayName, '龟背竹');
    expect(demoRecognitionResult.recognition.confidence, 96);
    expect(demoRecognitionResult.species?.scientificName, 'Monstera deliciosa');
  });

  test('demo garden can receive a plant from recognition result', () async {
    final controller = DemoGardenController();
    final before = controller.state.length;

    await controller.addPlant(
      name: demoRecognitionResult.displayName,
      nickname: '识别出的龟背竹',
      location: '客厅窗边',
    );

    expect(controller.state, hasLength(before + 1));
    expect(controller.state.last.displayName, '识别出的龟背竹');
    expect(controller.state.last.species.name, '龟背竹');
  });

  test('demo reminder can be created and completed locally', () async {
    final controller = DemoReminderController();
    final before = controller.state.length;

    await controller.addReminder(
      plantId: 'demo-species-monstera',
      plantName: '龟背竹',
      careType: 'water',
      remindAt: DateTime(2026, 8, 19, 1),
    );

    expect(controller.state, hasLength(before + 1));
    final created = controller.state.last;
    expect(created.title, '给 龟背竹 浇水');

    await controller.complete(created.id);
    expect(controller.state, hasLength(before));
  });
}
