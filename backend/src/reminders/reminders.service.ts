import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReminderDto, UpdateReminderDto } from './dto/reminders.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function normalizePagination(page?: number, pageSize?: number) {
  return {
    page: page ?? DEFAULT_PAGE,
    pageSize: Math.min(pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
  };
}

@Injectable()
export class RemindersService {
  constructor(private prisma: PrismaService) {}

  async list(userId: number, todayOnly = false) {
    const where: any = { userId, isCompleted: false };
    if (todayOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.remindAt = { gte: today, lt: tomorrow };
    }

    const reminders = await this.prisma.reminder.findMany({
      where,
      include: {
        myPlant: {
          select: { id: true, nickname: true, species: { select: { name: true, imageUrl: true } } },
        },
      },
      orderBy: { remindAt: 'asc' },
    });

    return reminders.map((r) => ({
      id: r.id.toString(),
      title: r.title,
      careType: r.careType,
      remindAt: r.remindAt.toISOString(),
      repeatRule: r.repeatRule,
      myPlant: r.myPlant
        ? {
            id: r.myPlant.id.toString(),
            nickname: r.myPlant.nickname,
            speciesName: r.myPlant.species?.name,
            imageUrl: r.myPlant.species?.imageUrl,
          }
        : null,
    }));
  }

  async getCompleted(userId: number, page?: number, pageSize?: number) {
    const pagination = normalizePagination(page, pageSize);
    const skip = (pagination.page - 1) * pagination.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.reminder.findMany({
        where: { userId, isCompleted: true },
        include: { myPlant: { select: { id: true, nickname: true } } },
        orderBy: { completedAt: 'desc' },
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.reminder.count({ where: { userId, isCompleted: true } }),
    ]);

    return {
      items: items.map((r) => ({
        id: r.id.toString(),
        title: r.title,
        careType: r.careType,
        remindAt: r.remindAt.toISOString(),
        completedAt: r.completedAt?.toISOString(),
      })),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  async create(userId: number, dto: CreateReminderDto) {
    if (dto.myPlantId) {
      await this.ensurePlantOwner(userId, dto.myPlantId);
    }

    const reminder = await this.prisma.reminder.create({
      data: {
        userId,
        myPlantId: dto.myPlantId ? Number(dto.myPlantId) : null,
        title: dto.title,
        remindAt: new Date(dto.remindAt),
        careType: dto.careType || null,
        repeatRule: dto.repeatRule || 'none',
      },
      include: {
        myPlant: { select: { id: true, nickname: true, species: { select: { name: true } } } },
      },
    });

    return {
      id: reminder.id.toString(),
      title: reminder.title,
      careType: reminder.careType,
      remindAt: reminder.remindAt.toISOString(),
      repeatRule: reminder.repeatRule,
      myPlant: reminder.myPlant
        ? { id: reminder.myPlant.id.toString(), nickname: reminder.myPlant.nickname }
        : null,
    };
  }

  async update(userId: number, reminderId: number, dto: UpdateReminderDto) {
    const existing = await this.prisma.reminder.findUnique({ where: { id: Number(reminderId) } });
    if (!existing) throw new NotFoundException({ code: 404, message: '提醒不存在' });
    if (existing.userId !== userId) throw new ForbiddenException({ code: 403, message: '无权限修改' });

    const reminder = await this.prisma.reminder.update({
      where: { id: Number(reminderId) },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.remindAt !== undefined && { remindAt: new Date(dto.remindAt) }),
        ...(dto.repeatRule !== undefined && { repeatRule: dto.repeatRule }),
      },
    });

    return {
      id: reminder.id.toString(),
      title: reminder.title,
      careType: reminder.careType,
      remindAt: reminder.remindAt.toISOString(),
      repeatRule: reminder.repeatRule,
    };
  }

  async complete(userId: number, reminderId: number) {
    const existing = await this.prisma.reminder.findUnique({ where: { id: Number(reminderId) } });
    if (!existing) throw new NotFoundException({ code: 404, message: '提醒不存在' });
    if (existing.userId !== userId) throw new ForbiddenException({ code: 403, message: '无权限' });

    const now = new Date();
    const data: any = { isCompleted: true, completedAt: now };

    // 若为重复提醒，生成下一个提醒时间
    if (existing.repeatRule && existing.repeatRule !== 'none') {
      const next = this.calcNextRemindAt(existing.remindAt, existing.repeatRule);
      // 创建新提醒
      await this.prisma.reminder.create({
        data: {
          userId: existing.userId,
          myPlantId: existing.myPlantId,
          title: existing.title,
          careType: existing.careType,
          remindAt: next,
          repeatRule: existing.repeatRule,
        },
      });
    }

    await this.prisma.reminder.update({ where: { id: Number(reminderId) }, data });

    return { message: '提醒已完成' };
  }

  async delete(userId: number, reminderId: number) {
    const existing = await this.prisma.reminder.findUnique({ where: { id: Number(reminderId) } });
    if (!existing) throw new NotFoundException({ code: 404, message: '提醒不存在' });
    if (existing.userId !== userId) throw new ForbiddenException({ code: 403, message: '无权限' });

    await this.prisma.reminder.delete({ where: { id: Number(reminderId) } });
    return { message: '删除成功' };
  }

  private async ensurePlantOwner(userId: number, plantId: number) {
    const plant = await this.prisma.myPlant.findUnique({ where: { id: Number(plantId) } });
    if (!plant) throw new NotFoundException({ code: 404, message: '植物不存在' });
    if (plant.userId !== userId) throw new ForbiddenException({ code: 403, message: '无权限操作该植物' });
  }

  private calcNextRemindAt(current: Date, rule: string): Date {
    const next = new Date(current);
    switch (rule) {
      case 'daily':    next.setDate(next.getDate() + 1); break;
      case 'weekly':   next.setDate(next.getDate() + 7); break;
      case 'biweekly': next.setDate(next.getDate() + 14); break;
      case 'monthly':  next.setMonth(next.getMonth() + 1); break;
    }
    return next;
  }
}


