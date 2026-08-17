import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCareLogDto } from './dto/care-logs.dto';

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
export class CareLogsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: number, plantId?: number, page?: number, pageSize?: number) {
    const pagination = normalizePagination(page, pageSize);
    const skip = (pagination.page - 1) * pagination.pageSize;
    const where: any = { userId };
    if (plantId) where.myPlantId = Number(plantId);

    const [items, total] = await Promise.all([
      this.prisma.careLog.findMany({
        where,
        include: {
          myPlant: { select: { id: true, nickname: true, species: { select: { name: true } } } },
        },
        orderBy: { performedAt: 'desc' },
        skip, take: pagination.pageSize,
      }),
      this.prisma.careLog.count({ where }),
    ]);

    return {
      items: items.map((r) => ({
        id: r.id.toString(),
        careType: r.careType,
        note: r.note,
        performedAt: r.performedAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        myPlant: {
          id: r.myPlant.id.toString(),
          nickname: r.myPlant.nickname,
          speciesName: r.myPlant.species?.name,
        },
      })),
      total, page: pagination.page, pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  async create(userId: number, dto: CreateCareLogDto) {
    const plant = await this.prisma.myPlant.findUnique({ where: { id: Number(dto.myPlantId) } });
    if (!plant) throw new NotFoundException({ code: 404, message: '植物不存在' });
    if (plant.userId !== userId) throw new ForbiddenException({ code: 403, message: '无权限' });

    const log = await this.prisma.careLog.create({
      data: {
        userId,
        myPlantId: Number(dto.myPlantId),
        careType: dto.careType,
        note: dto.note || null,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : new Date(),
      },
      include: {
        myPlant: { select: { id: true, nickname: true } },
      },
    });

    return {
      id: log.id.toString(),
      careType: log.careType,
      note: log.note,
      performedAt: log.performedAt.toISOString(),
      myPlant: { id: log.myPlant.id.toString(), nickname: log.myPlant.nickname },
    };
  }

  async delete(userId: number, logId: number) {
    const log = await this.prisma.careLog.findUnique({ where: { id: Number(logId) } });
    if (!log) throw new NotFoundException({ code: 404, message: '记录不存在' });
    if (log.userId !== userId) throw new ForbiddenException({ code: 403, message: '无权限' });

    await this.prisma.careLog.delete({ where: { id: Number(logId) } });
    return { message: '删除成功' };
  }
}


