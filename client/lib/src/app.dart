import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/demo/demo_mode_controller.dart';
import 'features/auth/application/auth_controller.dart';
import 'features/auth/presentation/login_page.dart';
import 'features/garden/data/demo_garden_controller.dart';
import 'features/garden/presentation/garden_page.dart';
import 'features/recognition/presentation/recognition_page.dart';
import 'features/reminders/data/demo_reminder_controller.dart';
import 'features/reminders/presentation/reminders_page.dart';
import 'theme/app_theme.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        name: 'splash',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => AuthenticatedShell(child: child),
        routes: [
          GoRoute(
            path: '/garden',
            name: 'garden',
            builder: (context, state) => const GardenPage(),
          ),
          GoRoute(
            path: '/reminders',
            name: 'reminders',
            builder: (context, state) => const RemindersPage(),
          ),
          GoRoute(
            path: '/recognition',
            name: 'recognition',
            builder: (context, state) => const RecognitionPage(),
          ),
        ],
      ),
    ],
  );
});

class PlantStoryApp extends ConsumerWidget {
  const PlantStoryApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: '植の物语',
      theme: buildAppTheme(),
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(demoModeProvider.notifier).restore();
      if (ref.read(demoModeProvider)) {
        await ref.read(demoGardenProvider.notifier).restore();
        await ref.read(demoRemindersProvider.notifier).restore();
        if (mounted) context.go('/garden');
        return;
      }

      await ref.read(authControllerProvider.notifier).restoreSession();
      if (!mounted) return;
      final user = ref.read(authControllerProvider).valueOrNull;
      context.go(user == null ? '/login' : '/garden');
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('正在恢复登录状态...'),
          ],
        ),
      ),
    );
  }
}

class AuthenticatedShell extends ConsumerStatefulWidget {
  const AuthenticatedShell({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<AuthenticatedShell> createState() => _AuthenticatedShellState();
}

class _AuthenticatedShellState extends ConsumerState<AuthenticatedShell> {
  bool _checked = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(_ensureAuthenticated);
  }

  Future<void> _ensureAuthenticated() async {
    await ref.read(demoModeProvider.notifier).restore();
    if (ref.read(demoModeProvider)) {
      await ref.read(demoGardenProvider.notifier).restore();
      await ref.read(demoRemindersProvider.notifier).restore();
      if (mounted) setState(() => _checked = true);
      return;
    }

    final currentUser = ref.read(authControllerProvider).valueOrNull;
    if (currentUser == null) {
      await ref.read(authControllerProvider.notifier).restoreSession();
    }
    if (!mounted) return;
    final user = ref.read(authControllerProvider).valueOrNull;
    if (user == null) {
      context.go('/login');
      return;
    }
    setState(() => _checked = true);
  }

  @override
  Widget build(BuildContext context) {
    final isDemoMode = ref.watch(demoModeProvider);
    final authState = ref.watch(authControllerProvider);
    if (!_checked || (!isDemoMode && authState.isLoading)) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('正在恢复登录状态...'),
            ],
          ),
        ),
      );
    }
    return AppShell(child: widget.child);
  }
}

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final selectedIndex = location.startsWith('/reminders')
        ? 1
        : location.startsWith('/recognition')
        ? 2
        : 0;

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (index) {
          context.go(switch (index) {
            0 => '/garden',
            1 => '/reminders',
            _ => '/recognition',
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.eco_outlined),
            selectedIcon: Icon(Icons.eco),
            label: '我的花园',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_none),
            selectedIcon: Icon(Icons.notifications),
            label: '提醒',
          ),
          NavigationDestination(
            icon: Icon(Icons.camera_alt_outlined),
            selectedIcon: Icon(Icons.camera_alt),
            label: '识别',
          ),
        ],
      ),
    );
  }
}
