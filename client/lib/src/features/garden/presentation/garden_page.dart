import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/demo/demo_mode_controller.dart';
import '../../auth/application/auth_controller.dart';
import '../data/demo_garden_controller.dart';
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
              onRefresh: () async {
                if (ref.read(demoModeProvider)) {
                  await ref.read(demoGardenProvider.notifier).restore();
                  return;
                }
                final _ = await ref.refresh(gardenPlantsProvider.future);
              },
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
                children: [
                  _GardenHeader(
                    plantCount: items.length,
                    onAddPlant: ref.read(demoModeProvider) ? () => _showAddPlantDialog(context, ref) : null,
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
                    for (final plant in items)
                      _PlantCard(
                        plant: plant,
                        onDelete: ref.read(demoModeProvider)
                            ? () => _confirmDeletePlant(context, ref, plant)
                            : null,
                      ),
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

Future<void> _showAddPlantDialog(BuildContext context, WidgetRef ref) async {
  final nameController = TextEditingController();
  final nicknameController = TextEditingController();
  final locationController = TextEditingController();
  final formKey = GlobalKey<FormState>();

  final result = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('添加植物'),
      content: Form(
        key: formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: nameController,
                autofocus: true,
                decoration: const InputDecoration(labelText: '植物名称', hintText: '例如：琴叶榕'),
                validator: (value) => value?.trim().isEmpty == true ? '请输入植物名称' : null,
              ),
              TextField(
                controller: nicknameController,
                decoration: const InputDecoration(labelText: '昵称（可选）'),
              ),
              TextField(
                controller: locationController,
                decoration: const InputDecoration(labelText: '摆放位置（可选）'),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('取消')),
        FilledButton(
          onPressed: () {
            if (formKey.currentState?.validate() == true) Navigator.pop(dialogContext, true);
          },
          child: const Text('加入花园'),
        ),
      ],
    ),
  );

  if (result == true && context.mounted) {
    await ref.read(demoGardenProvider.notifier).addPlant(
          name: nameController.text,
          nickname: nicknameController.text,
          location: locationController.text,
        );
    ref.invalidate(gardenPlantsProvider);
  }
  nameController.dispose();
  nicknameController.dispose();
  locationController.dispose();
}

Future<void> _confirmDeletePlant(BuildContext context, WidgetRef ref, GardenPlant plant) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('删除植物？'),
      content: Text('将从 Demo 花园中移除“${plant.displayName}”。'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('取消')),
        FilledButton.tonal(
          onPressed: () => Navigator.pop(dialogContext, true),
          child: const Text('删除'),
        ),
      ],
    ),
  );

  if (confirmed == true && context.mounted) {
    await ref.read(demoGardenProvider.notifier).removePlant(plant.id);
    ref.invalidate(gardenPlantsProvider);
  }
}

class _GardenHeader extends StatelessWidget {
  const _GardenHeader({required this.plantCount, required this.onLogout, this.onAddPlant});

  final int plantCount;
  final Future<void> Function() onLogout;
  final VoidCallback? onAddPlant;

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
        if (onAddPlant != null)
          IconButton.filledTonal(
            tooltip: '添加植物',
            onPressed: onAddPlant,
            icon: const Icon(Icons.add),
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
  const _PlantCard({required this.plant, this.onDelete});

  final GardenPlant plant;
  final VoidCallback? onDelete;

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
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        plant.displayName,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF1B5E20),
                            ),
                      ),
                    ),
                    if (onDelete != null)
                      IconButton(
                        tooltip: '删除植物',
                        onPressed: onDelete,
                        icon: const Icon(Icons.delete_outline, size: 20),
                        color: Colors.black38,
                      ),
                  ],
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
