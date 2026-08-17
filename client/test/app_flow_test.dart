import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:plant_story/src/app.dart';
import 'package:plant_story/src/features/auth/data/auth_models.dart';
import 'package:plant_story/src/features/auth/data/auth_repository.dart';
import 'package:plant_story/src/features/garden/data/garden_models.dart';
import 'package:plant_story/src/features/garden/data/garden_repository.dart';
import 'package:plant_story/src/features/recognition/data/recognition_models.dart';
import 'package:plant_story/src/features/recognition/data/recognition_repository.dart';
import 'package:plant_story/src/features/recognition/presentation/recognition_page.dart';
import 'package:plant_story/src/features/reminders/data/reminder_models.dart';
import 'package:plant_story/src/features/reminders/data/reminders_repository.dart';

void main() {
  testWidgets('app startup restores web cookie session and opens garden', (
    tester,
  ) async {
    final authRepository = _FakeAuthRepository(
      restoreUser: const AuthUser(id: '7', username: 'restored'),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: _overrides(authRepository: authRepository),
        child: const PlantStoryApp(),
      ),
    );

    expect(find.text('正在恢复登录状态...'), findsOneWidget);
    await tester.pumpAndSettle();

    expect(authRepository.restoreCalls, 1);
    expect(find.text('我的花园'), findsWidgets);
    expect(find.text('Sprint F 绿萝'), findsOneWidget);
    expect(find.text('欢迎回来，继续照顾你的植物'), findsNothing);
  });

  testWidgets('app startup shows login page when web cookie restore fails', (
    tester,
  ) async {
    final authRepository = _FakeAuthRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: _overrides(authRepository: authRepository),
        child: const PlantStoryApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(authRepository.restoreCalls, 1);
    expect(find.text('欢迎回来，继续照顾你的植物'), findsOneWidget);
    expect(find.text('Sprint F 绿萝'), findsNothing);
  });

  testWidgets('login routes to garden and renders plants from repository', (
    tester,
  ) async {
    final authRepository = _FakeAuthRepository();
    final gardenRepository = _FakeGardenRepository();
    final remindersRepository = _FakeRemindersRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: _overrides(
          authRepository: authRepository,
          gardenRepository: gardenRepository,
          remindersRepository: remindersRepository,
        ),
        child: const PlantStoryApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.bySemanticsLabel('用户名'), 'sprintf2');
    await tester.enterText(find.bySemanticsLabel('密码'), 'Demo123456');
    await tester.tap(find.text('登录花园'));
    await tester.pumpAndSettle();

    expect(authRepository.loginCalls, 1);
    expect(find.text('我的花园'), findsWidgets);
    expect(find.text('Sprint F 绿萝'), findsOneWidget);
    expect(find.textContaining('Web 联调台'), findsOneWidget);
  });

  testWidgets('register mode registers user then routes to garden', (
    tester,
  ) async {
    final authRepository = _FakeAuthRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: _overrides(authRepository: authRepository),
        child: const PlantStoryApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('注册'));
    await tester.pumpAndSettle();

    expect(find.text('开启你的第一座植物花园'), findsOneWidget);

    await tester.enterText(find.bySemanticsLabel('用户名'), 'new-user');
    await tester.enterText(find.bySemanticsLabel('密码'), 'Demo123456');
    await tester.ensureVisible(find.text('注册并登录'));
    await tester.tap(find.text('注册并登录'));
    await tester.pumpAndSettle();

    expect(authRepository.registerCalls, 1);
    expect(find.text('Sprint F 绿萝'), findsOneWidget);
  });

  testWidgets('reminders page completes reminder and refreshes pending list', (
    tester,
  ) async {
    final remindersRepository = _FakeRemindersRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: _overrides(remindersRepository: remindersRepository),
        child: const PlantStoryApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.bySemanticsLabel('用户名'), 'sprintf2');
    await tester.enterText(find.bySemanticsLabel('密码'), 'Demo123456');
    await tester.tap(find.text('登录花园'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('提醒'));
    await tester.pumpAndSettle();

    expect(find.text('Sprint F 联调浇水'), findsOneWidget);

    await tester.tap(find.byTooltip('完成'));
    await tester.pumpAndSettle();

    expect(remindersRepository.completedIds, ['1']);
    expect(find.text('Sprint F 联调浇水'), findsNothing);
    expect(find.text('暂无待办提醒'), findsOneWidget);
  });

  testWidgets('recognition page is available from bottom navigation', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(overrides: _overrides(), child: const PlantStoryApp()),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.bySemanticsLabel('用户名'), 'sprintf2');
    await tester.enterText(find.bySemanticsLabel('密码'), 'Demo123456');
    await tester.tap(find.text('登录花园'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('识别'));
    await tester.pumpAndSettle();

    expect(find.text('植物识别'), findsWidgets);
    expect(find.text('选择一张植物图片开始识别'), findsOneWidget);
    expect(find.text('从相册选择'), findsOneWidget);
    expect(find.text('拍照识别'), findsOneWidget);
  });

  testWidgets('recognition result can be added to garden with custom details', (
    tester,
  ) async {
    final gardenRepository = _FakeGardenRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          gardenRepositoryProvider.overrideWithValue(gardenRepository),
        ],
        child: MaterialApp(
          home: RecognitionPage(initialResult: _recognitionResult),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('添加到我的花园'),
      300,
      scrollable: find.byType(Scrollable).last,
    );
    expect(find.text('添加到我的花园'), findsOneWidget);
    await tester.tap(find.text('添加到我的花园'));
    await tester.pumpAndSettle();

    expect(find.text('把 绿萝 加入花园'), findsOneWidget);
    await tester.enterText(find.widgetWithText(TextFormField, '绿萝'), '窗边绿萝');
    await tester.enterText(find.widgetWithText(TextField, '摆放位置（可选）'), '客厅窗边');
    await tester.tap(find.text('加入花园'));
    await tester.pumpAndSettle();

    expect(gardenRepository.addedSpeciesId, 2);
    expect(gardenRepository.addedNickname, '窗边绿萝');
    expect(gardenRepository.addedLocation, '客厅窗边');
    expect(find.text('绿萝 已加入我的花园'), findsOneWidget);
  });

  testWidgets('logout clears session and returns to login page', (
    tester,
  ) async {
    final authRepository = _FakeAuthRepository(
      restoreUser: const AuthUser(id: '7', username: 'restored'),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: _overrides(authRepository: authRepository),
        child: const PlantStoryApp(),
      ),
    );

    await tester.pumpAndSettle();
    expect(find.text('Sprint F 绿萝'), findsOneWidget);

    await tester.tap(find.byTooltip('退出登录'));
    await tester.pumpAndSettle();

    expect(authRepository.logoutCalls, 1);
    expect(find.text('欢迎回来，继续照顾你的植物'), findsOneWidget);
    expect(find.text('Sprint F 绿萝'), findsNothing);
  });
}

List<Override> _overrides({
  _FakeAuthRepository? authRepository,
  _FakeGardenRepository? gardenRepository,
  _FakeRemindersRepository? remindersRepository,
  _FakeRecognitionRepository? recognitionRepository,
}) {
  return [
    authRepositoryProvider.overrideWithValue(
      authRepository ?? _FakeAuthRepository(),
    ),
    gardenRepositoryProvider.overrideWithValue(
      gardenRepository ?? _FakeGardenRepository(),
    ),
    remindersRepositoryProvider.overrideWithValue(
      remindersRepository ?? _FakeRemindersRepository(),
    ),
    recognitionRepositoryProvider.overrideWithValue(
      recognitionRepository ?? _FakeRecognitionRepository(),
    ),
  ];
}

class _FakeAuthRepository implements AuthRepository {
  _FakeAuthRepository({this.restoreUser});

  final AuthUser? restoreUser;
  int loginCalls = 0;
  int registerCalls = 0;
  int restoreCalls = 0;
  int logoutCalls = 0;

  @override
  Future<AuthSession> login({
    required String username,
    required String password,
  }) async {
    loginCalls += 1;
    return _session(username);
  }

  @override
  Future<AuthSession> register({
    required String username,
    required String password,
  }) async {
    registerCalls += 1;
    return _session(username);
  }

  @override
  Future<AuthUser> profile() async =>
      const AuthUser(id: '1', username: 'sprintf2');

  @override
  Future<AuthUser?> restoreSessionFromWebCookie() async {
    restoreCalls += 1;
    return restoreUser;
  }

  @override
  Future<void> logout() async {
    logoutCalls += 1;
  }

  AuthSession _session(String username) {
    return AuthSession(
      user: AuthUser(id: '1', username: username),
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    );
  }
}

class _FakeGardenRepository implements GardenRepository {
  int? addedSpeciesId;
  String? addedNickname;
  String? addedLocation;

  @override
  Future<GardenPlant> addPlant({
    required int speciesId,
    String? nickname,
    String? location,
  }) async {
    addedSpeciesId = speciesId;
    addedNickname = nickname;
    addedLocation = location;
    return _plant;
  }

  @override
  Future<List<GardenPlant>> listPlants() async => [_plant];

  static const _plant = GardenPlant(
    id: '4',
    nickname: 'Sprint F 绿萝',
    location: 'Web 联调台',
    currentStage: 'growing',
    species: PlantSpeciesSummary(
      id: '1',
      name: '绿萝',
      scientificName: 'Epipremnum aureum',
      watering: 'weekly',
      sunlight: 'indirect',
    ),
  );
}

class _FakeRemindersRepository implements RemindersRepository {
  final completedIds = <String>[];

  @override
  Future<void> complete(String id) async {
    completedIds.add(id);
  }

  @override
  Future<List<ReminderItem>> listPending({bool todayOnly = false}) async {
    if (completedIds.contains('1')) return [];
    return [
      ReminderItem(
        id: '1',
        title: 'Sprint F 联调浇水',
        careType: 'water',
        remindAt: DateTime.utc(2026, 8, 11, 7, 35),
        repeatRule: 'none',
        myPlant: const ReminderPlantSummary(
          id: '4',
          nickname: 'Sprint F 绿萝',
          speciesName: '绿萝',
        ),
      ),
    ];
  }
}

class _FakeRecognitionRepository implements RecognitionRepository {
  @override
  Future<RecognitionResult> identifyPlant(String imageBase64) async {
    return _recognitionResult;
  }
}

final _recognitionResult = RecognitionResult(
  recognition: RecognitionRecord(
    id: '1',
    rawName: 'Sprint G 绿萝',
    confidence: 98,
    createdAt: DateTime.utc(2026, 8, 13, 7),
  ),
  species: const RecognizedSpecies(
    id: '2',
    name: '绿萝',
    scientificName: 'Epipremnum aureum',
    watering: 'weekly',
    sunlight: 'indirect',
    description: '适合室内养护。',
  ),
  baikeInfo: const RecognitionBaikeInfo(description: '识别结果展示。'),
);
