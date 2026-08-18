import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Controls the public, no-login demo experience.
///
/// The preference is persisted by shared_preferences (browser localStorage on
/// Flutter Web), so a visitor can refresh the demo without being sent back to
/// the login screen.
class DemoModeController extends StateNotifier<bool> {
  DemoModeController() : super(false);

  static const _storageKey = 'plant_story.demo_mode_enabled';

  Future<void> restore() async {
    // Demo persistence is a browser concern. Skipping the plugin in widget
    // tests keeps the existing authenticated-flow tests deterministic.
    if (!kIsWeb) {
      state = false;
      return;
    }
    final preferences = await SharedPreferences.getInstance();
    state = preferences.getBool(_storageKey) ?? false;
  }

  Future<void> enable() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setBool(_storageKey, true);
    state = true;
  }

  Future<void> disable() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove(_storageKey);
    state = false;
  }
}

final demoModeProvider = StateNotifierProvider<DemoModeController, bool>((ref) {
  return DemoModeController();
});
