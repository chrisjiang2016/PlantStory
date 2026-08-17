import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AchievementsService {
  constructor(private prisma: PrismaService) {}

  /** 获取所有成就定义 */
  async getAll() {
    const achievements = await this.prisma.achievement.findMany({ orderBy: { id: 'asc' } });
    return achievements.map((a) => ({
      id: a.id.toString(), code: a.code, name: a.name, description: a.description,
      icon: a.icon, conditionType: a.conditionType, conditionValue: a.conditionValue,
    }));
  }

  /** 获取用户已解锁成就 */
  async getUserAchievements(userId: number) {
    const items = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });
    return items.map((ua) => ({
      code: ua.achievement.code, name: ua.achievement.name, icon: ua.achievement.icon,
      description: ua.achievement.description, unlockedAt: ua.unlockedAt.toISOString(),
    }));
  }

  /** 检查并解锁成就（在关键操作后调用） */
  async checkAndUnlock(userId: number) {
    const newlyUnlocked: string[] = [];
    const existing = await this.prisma.userAchievement.findMany({ where: { userId } });
    const unlockedCodes = new Set(existing.map((e) => e.achievementId.toString()));

    const achievements = await this.prisma.achievement.findMany();
    for (const a of achievements) {
      if (unlockedCodes.has(a.id.toString())) continue;
      const count = await this.evaluateCondition(userId, a.conditionType, a.conditionValue);
      if (count >= (a.conditionValue || 0)) {
        await this.prisma.userAchievement.create({ data: { userId, achievementId: a.id } });
        newlyUnlocked.push(a.name);
      }
    }
    return { newlyUnlocked };
  }

  private async evaluateCondition(userId: number, type: string | null, _value: number | null): Promise<number> {
    switch (type) {
      case 'plant_count':
        return this.prisma.myPlant.count({ where: { userId } });
      case 'care_count:water':
        return this.prisma.careLog.count({ where: { userId, careType: 'water' } });
      case 'diary_count':
        return this.prisma.diary.count({ where: { userId } });
      case 'diagnosis_count':
        return this.prisma.diagnosis.count({ where: { userId } });
      default: return 0;
    }
  }
}

