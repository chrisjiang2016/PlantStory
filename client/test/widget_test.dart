import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:plant_story/src/app.dart';
import 'package:plant_story/src/features/auth/data/auth_models.dart';
import 'package:plant_story/src/features/auth/data/auth_repository.dart';

void main() {
  testWidgets('renders login entry screen', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
        ],
        child: const PlantStoryApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('植の物语'), findsOneWidget);
    expect(find.text('欢迎回来，继续照顾你的植物'), findsOneWidget);
    expect(find.text('登录'), findsOneWidget);
  });
}

class _FakeAuthRepository implements AuthRepository {
  @override
  Future<AuthSession> login({
    required String username,
    required String password,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<AuthSession> register({
    required String username,
    required String password,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<AuthUser> profile() async => const AuthUser(id: '1', username: 'test');

  @override
  Future<AuthUser?> restoreSessionFromWebCookie() async => null;

  @override
  Future<void> logout() async {}
}
