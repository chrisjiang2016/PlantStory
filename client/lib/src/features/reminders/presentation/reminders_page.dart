import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/reminder_models.dart';
import '../data/reminders_repository.dart';

class RemindersPage extends ConsumerWidget {
  const RemindersPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reminders = ref.watch(pendingRemindersProvider);

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
          child: reminders.when(
            data: (items) => RefreshIndicator(
              onRefresh: () => ref.refresh(pendingRemindersProvider.future),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
                children: [
                  _RemindersHeader(count: items.length),
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
                    for (final reminder in items) _ReminderTile(reminder: reminder),
                  ],
                ],
              ),
            ),
            error: (error, stackTrace) => _ErrorView(message: error.toString()),
            loading: () => const Center(child: CircularProgressIndicator()),
          ),
        ),
      ),
    );
  }
}

class _RemindersHeader extends StatelessWidget {
  const _RemindersHeader({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Column(
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
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.black54),
        ),
      ],
    );
  }
}

class _TodayFocusCard extends StatelessWidget {
  const _TodayFocusCard({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF43A047),
        borderRadius: BorderRadius.circular(26),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2E7D32).withValues(alpha: 0.20),
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
            child: const Icon(Icons.water_drop_outlined, color: Colors.white, size: 34),
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

class _ReminderTile extends ConsumerWidget {
  const _ReminderTile({required this.reminder});

  final ReminderItem reminder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: _careColor(reminder.careType).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(_careIcon(reminder.careType), color: _careColor(reminder.careType), size: 30),
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
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.black54),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _ReminderMetaChip(icon: Icons.schedule, label: _formatDateTime(reminder.remindAt)),
                    if (reminder.repeatRule?.isNotEmpty == true)
                      _ReminderMetaChip(icon: Icons.repeat, label: reminder.repeatRule!),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filledTonal(
            tooltip: '完成',
            icon: const Icon(Icons.check_circle_outline),
            onPressed: () async {
              await ref.read(remindersRepositoryProvider).complete(reminder.id);
              ref.invalidate(pendingRemindersProvider);
            },
          ),
        ],
      ),
    );
  }

  static IconData _careIcon(String? careType) {
    return switch (careType) {
      'water' => Icons.water_drop_outlined,
      'fertilize' => Icons.compost_outlined,
      'prune' => Icons.content_cut_outlined,
      _ => Icons.notifications_active_outlined,
    };
  }

  static Color _careColor(String? careType) {
    return switch (careType) {
      'water' => const Color(0xFF1E88E5),
      'fertilize' => const Color(0xFF8D6E63),
      'prune' => const Color(0xFF43A047),
      _ => const Color(0xFF43A047),
    };
  }

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

class _EmptyReminders extends StatelessWidget {
  const _EmptyReminders();

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
            child: const Icon(Icons.check_circle_outline, color: Color(0xFF43A047), size: 38),
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
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.black54, height: 1.45),
          ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(message, textAlign: TextAlign.center),
      ),
    );
  }
}
