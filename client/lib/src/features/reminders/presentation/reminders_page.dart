import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/demo/demo_mode_controller.dart';
import '../../garden/data/demo_garden_controller.dart';
import '../../garden/data/garden_models.dart';
import '../data/demo_reminder_controller.dart';
import '../data/reminder_models.dart';
import '../data/reminders_repository.dart';

class RemindersPage extends ConsumerWidget {
  const RemindersPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDemoMode = ref.watch(demoModeProvider);
    if (isDemoMode) {
      final reminders = ref.watch(demoRemindersProvider);
      final plants = ref.watch(demoGardenProvider);
      return _RemindersScaffold(
        items: reminders,
        onRefresh: () => ref.read(demoRemindersProvider.notifier).restore(),
        onComplete: (id) =>
            ref.read(demoRemindersProvider.notifier).complete(id),
        onAdd: () => _showAddReminderDialog(context, ref, plants),
      );
    }

    final reminders = ref.watch(pendingRemindersProvider);
    return reminders.when(
      data: (items) => _RemindersScaffold(
        items: items,
        onRefresh: () => ref.refresh(pendingRemindersProvider.future),
        onComplete: (id) async {
          await ref.read(remindersRepositoryProvider).complete(id);
          ref.invalidate(pendingRemindersProvider);
        },
      ),
      error: (error, stackTrace) =>
          Scaffold(body: _ErrorView(message: error.toString())),
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
    );
  }
}

class _RemindersScaffold extends StatelessWidget {
  const _RemindersScaffold({
    required this.items,
    required this.onRefresh,
    required this.onComplete,
    this.onAdd,
  });

  final List<ReminderItem> items;
  final Future<void> Function() onRefresh;
  final Future<void> Function(String id) onComplete;
  final VoidCallback? onAdd;

  @override
  Widget build(BuildContext context) {
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
          child: RefreshIndicator(
            onRefresh: onRefresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
              children: [
                _RemindersHeader(count: items.length, onAdd: onAdd),
                const SizedBox(height: 18),
                if (items.isEmpty)
                  const _EmptyReminders()
                else ...[
                  _TodayFocusCard(count: items.length),
                  const SizedBox(height: 14),
                  Text(
                    '待办提醒',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF1B5E20),
                    ),
                  ),
                  const SizedBox(height: 10),
                  for (final reminder in items)
                    _ReminderTile(reminder: reminder, onComplete: onComplete),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

Future<void> _showAddReminderDialog(
  BuildContext context,
  WidgetRef ref,
  List<GardenPlant> plants,
) async {
  if (plants.isEmpty) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('请先在花园中添加一盆植物。')));
    return;
  }
  var selectedPlant = plants.first;
  var careType = 'water';
  final result = await showDialog<_DemoReminderDraft>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('新建养护提醒'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<GardenPlant>(
              initialValue: selectedPlant,
              decoration: const InputDecoration(labelText: '选择植物'),
              items: plants
                  .map(
                    (plant) => DropdownMenuItem(
                      value: plant,
                      child: Text(plant.displayName),
                    ),
                  )
                  .toList(growable: false),
              onChanged: (value) =>
                  setState(() => selectedPlant = value ?? selectedPlant),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: careType,
              decoration: const InputDecoration(labelText: '养护事项'),
              items: const [
                DropdownMenuItem(value: 'water', child: Text('浇水')),
                DropdownMenuItem(value: 'fertilize', child: Text('施肥')),
                DropdownMenuItem(value: 'prune', child: Text('修剪')),
              ],
              onChanged: (value) =>
                  setState(() => careType = value ?? careType),
            ),
            const SizedBox(height: 12),
            Text(
              '提醒将设为当前时间后 1 小时。',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(
              dialogContext,
              _DemoReminderDraft(plant: selectedPlant, careType: careType),
            ),
            child: const Text('创建提醒'),
          ),
        ],
      ),
    ),
  );
  if (result == null || !context.mounted) return;

  await ref
      .read(demoRemindersProvider.notifier)
      .addReminder(
        plantId: result.plant.id,
        plantName: result.plant.displayName,
        careType: result.careType,
        remindAt: DateTime.now().add(const Duration(hours: 1)),
      );
}

class _DemoReminderDraft {
  const _DemoReminderDraft({required this.plant, required this.careType});

  final GardenPlant plant;
  final String careType;
}

class _RemindersHeader extends StatelessWidget {
  const _RemindersHeader({required this.count, this.onAdd});

  final int count;
  final VoidCallback? onAdd;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '养护提醒',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF1B5E20),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                count == 0 ? '今天没有待办，植物们状态很安稳。' : '你还有 $count 条养护任务等待完成。',
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: Colors.black54),
              ),
            ],
          ),
        ),
        if (onAdd != null)
          IconButton.filledTonal(
            tooltip: '新建提醒',
            onPressed: onAdd,
            icon: const Icon(Icons.add_alert_outlined),
          ),
      ],
    );
  }
}

class _TodayFocusCard extends StatelessWidget {
  const _TodayFocusCard({required this.count});
  final int count;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: const Color(0xFF43A047),
      borderRadius: BorderRadius.circular(26),
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
          child: const Icon(
            Icons.water_drop_outlined,
            color: Colors.white,
            size: 34,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '今日重点养护',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '$count 条提醒待完成，完成后会自动刷新列表。',
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: Colors.white70),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _ReminderTile extends StatelessWidget {
  const _ReminderTile({required this.reminder, required this.onComplete});
  final ReminderItem reminder;
  final Future<void> Function(String id) onComplete;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 12),
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.94),
      borderRadius: BorderRadius.circular(24),
    ),
    child: Row(
      children: [
        Container(
          width: 54,
          height: 54,
          decoration: BoxDecoration(
            color: _careColor(reminder.careType).withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Icon(
            _careIcon(reminder.careType),
            color: _careColor(reminder.careType),
            size: 30,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                reminder.title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF1B5E20),
                ),
              ),
              const SizedBox(height: 5),
              Text(
                reminder.myPlant?.nickname ?? '未绑定植物',
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: Colors.black54),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _ReminderMetaChip(
                    icon: Icons.schedule,
                    label: _formatDateTime(reminder.remindAt),
                  ),
                  if (reminder.repeatRule?.isNotEmpty == true)
                    _ReminderMetaChip(
                      icon: Icons.repeat,
                      label: reminder.repeatRule!,
                    ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        IconButton.filledTonal(
          tooltip: '完成',
          icon: const Icon(Icons.check_circle_outline),
          onPressed: () => onComplete(reminder.id),
        ),
      ],
    ),
  );

  static IconData _careIcon(String? careType) => switch (careType) {
    'water' => Icons.water_drop_outlined,
    'fertilize' => Icons.compost_outlined,
    'prune' => Icons.content_cut_outlined,
    _ => Icons.notifications_active_outlined,
  };
  static Color _careColor(String? careType) => switch (careType) {
    'water' => const Color(0xFF1E88E5),
    'fertilize' => const Color(0xFF8D6E63),
    'prune' => const Color(0xFF43A047),
    _ => const Color(0xFF43A047),
  };
  static String _formatDateTime(DateTime value) {
    final local = value.toLocal();
    String two(int number) => number.toString().padLeft(2, '0');
    return '${local.year}-${two(local.month)}-${two(local.day)} ${two(local.hour)}:${two(local.minute)}';
  }
}

class _ReminderMetaChip extends StatelessWidget {
  const _ReminderMetaChip({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) => Container(
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
        Text(
          label,
          style: Theme.of(
            context,
          ).textTheme.labelSmall?.copyWith(color: const Color(0xFF2E7D32)),
        ),
      ],
    ),
  );
}

class _EmptyReminders extends StatelessWidget {
  const _EmptyReminders();
  @override
  Widget build(BuildContext context) => Container(
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
          child: const Icon(
            Icons.check_circle_outline,
            color: Color(0xFF43A047),
            size: 38,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          '暂无待办提醒',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w800,
            color: const Color(0xFF1B5E20),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '当前没有需要处理的养护任务，可以安心观察植物状态。',
          textAlign: TextAlign.center,
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(color: Colors.black54, height: 1.45),
        ),
      ],
    ),
  );
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Text(message, textAlign: TextAlign.center),
    ),
  );
}
