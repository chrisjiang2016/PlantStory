import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth/application/auth_controller.dart';
import '../data/garden_models.dart';
import '../data/garden_repository.dart';

class GardenPage extends ConsumerWidget {
  const GardenPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plants = ref.watch(gardenPlantsProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFE8F5E9), Color(0xFFF7FBF4), Color(0xFFFFFBF0)],
          ),
        ),
        child: SafeArea(
          child: plants.when(
            data: (items) => RefreshIndicator(
              onRefresh: () => ref.refresh(gardenPlantsProvider.future),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
                children: [
                  _GardenHeader(
                    plantCount: items.length,
                    onLogout: () async {
                      await ref.read(authControllerProvider.notifier).logout();
                      if (context.mounted) context.go('/login');
                    },
                  ),
                  const SizedBox(height: 18),
                  if (items.isEmpty)
                    const _EmptyGarden()
                  else ...[
                    _GardenSummaryCard(plants: items),
                    const SizedBox(height: 14),
                    Text(
                      '我的植物',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF1B5E20),
                          ),
                    ),
                    const SizedBox(height: 10),
                    for (final plant in items) _PlantCard(plant: plant),
                  ],
                ],
              ),
            ),
            error: (error, stackTrace) => _ErrorView(
              message: error.toString(),
              onRetry: () => ref.invalidate(gardenPlantsProvider),
            ),
            loading: () => const Center(child: CircularProgressIndicator()),
          ),
        ),
      ),
    );
  }
}

class _GardenHeader extends StatelessWidget {
  const _GardenHeader({required this.plantCount, required this.onLogout});

  final int plantCount;
  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '我的花园',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF1B5E20),
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                plantCount == 0 ? '种下第一盆植物，开始你的养护故事。' : '今天也继续照顾你的 $plantCount 位绿色伙伴。',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.black54),
              ),
            ],
          ),
        ),
        IconButton.filledTonal(
          tooltip: '退出登录',
          onPressed: onLogout,
          icon: const Icon(Icons.logout),
        ),
      ],
    );
  }
}

class _GardenSummaryCard extends StatelessWidget {
  const _GardenSummaryCard({required this.plants});

  final List<GardenPlant> plants;

  @override
  Widget build(BuildContext context) {
    final locations = plants.where((plant) => plant.location?.isNotEmpty == true).length;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF2E7D32),
        borderRadius: BorderRadius.circular(26),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2E7D32).withValues(alpha: 0.22),
            blurRadius: 28,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(Icons.eco, color: Colors.white, size: 34),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${plants.length} 盆植物正在成长',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 6),
                Text(
                  locations == 0 ? '还可以为植物补充摆放位置。' : '$locations 盆植物已记录摆放位置。',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PlantCard extends StatelessWidget {
  const _PlantCard({required this.plant});

  final GardenPlant plant;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2E7D32).withValues(alpha: 0.08),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          _PlantAvatar(url: plant.photoUrl ?? plant.species.imageUrl),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  plant.displayName,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF1B5E20),
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  plant.species.name,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.black54),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _PlantMetaChip(icon: Icons.spa_outlined, label: '阶段：${plant.currentStage}'),
                    if (plant.location?.isNotEmpty == true)
                      _PlantMetaChip(icon: Icons.place_outlined, label: plant.location!),
                    if (plant.species.watering?.isNotEmpty == true)
                      _PlantMetaChip(icon: Icons.water_drop_outlined, label: plant.species.watering!),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PlantMetaChip extends StatelessWidget {
  const _PlantMetaChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F8E9),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: const Color(0xFF43A047)),
          const SizedBox(width: 4),
          Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: const Color(0xFF2E7D32))),
        ],
      ),
    );
  }
}

class _PlantAvatar extends StatelessWidget {
  const _PlantAvatar({this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty) {
      return Container(
        width: 58,
        height: 58,
        decoration: BoxDecoration(
          color: const Color(0xFFE8F5E9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Icon(Icons.eco, color: Color(0xFF43A047), size: 32),
      );
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: Image.network(
        url!,
        width: 58,
        height: 58,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => Container(
          width: 58,
          height: 58,
          color: const Color(0xFFE8F5E9),
          child: const Icon(Icons.eco, color: Color(0xFF43A047)),
        ),
      ),
    );
  }
}

class _EmptyGarden extends StatelessWidget {
  const _EmptyGarden();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: const Color(0xFFF1F8E9),
              borderRadius: BorderRadius.circular(24),
            ),
            child: const Icon(Icons.add_circle_outline, color: Color(0xFF43A047), size: 38),
          ),
          const SizedBox(height: 16),
          Text(
            '还没有植物',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF1B5E20),
                ),
          ),
          const SizedBox(height: 8),
          Text(
            '下一步会接入识别结果或百科详情，一键加入花园。',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.black54, height: 1.45),
          ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: const Text('重试')),
          ],
        ),
      ),
    );
  }
}
