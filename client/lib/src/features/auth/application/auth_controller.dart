import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_models.dart';
import '../data/auth_repository.dart';

class AuthController extends StateNotifier<AsyncValue<AuthUser?>> {
  AuthController(this._repository) : super(const AsyncValue.data(null));

  final AuthRepository _repository;

  Future<void> restoreSession() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(_repository.restoreSessionFromWebCookie);
  }

  Future<void> login(String username, String password) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final session = await _repository.login(username: username, password: password);
      return session.user;
    });
  }

  Future<void> register(String username, String password) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final session = await _repository.register(username: username, password: password);
      return session.user;
    });
  }

  Future<void> loadProfile() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(_repository.profile);
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AsyncValue.data(null);
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AsyncValue<AuthUser?>>((ref) {
  return AuthController(ref.watch(authRepositoryProvider));
});
