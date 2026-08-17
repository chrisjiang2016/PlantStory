import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiaryDto } from './dto/diaries.dto';

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
export class DiariesService {
  constructor(private prisma: PrismaService) {}

  async list(userId: number, plantId?: number, page?: number, pageSize?: number) {
    const pagination = normalizePagination(page, pageSize);
    const skip = (pagination.page - 1) * pagination.pageSize;
    const where: any = { userId };
    if (plantId) where.myPlantId = Number(plantId);

    const [items, total] = await Promise.all([
      this.prisma.diary.findMany({
        where,
        include: { myPlant: { select: { id: true, nickname: true, species: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip, take: pagination.pageSize,
      }),
      this.prisma.diary.count({ where }),
    ]);

    return {
      items: items.map((d) => ({
        id: d.id.toString(), content: d.content, imageUrl: d.imageUrl,
        createdAt: d.createdAt.toISOString(),
        myPlant: { id: d.myPlant.id.toString(), nickname: d.myPlant.nickname, speciesName: d.myPlant.species?.name },
      })),
      total, page: pagination.page, pageSize: pagination.pageSize, totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  async create(userId: number, dto: CreateDiaryDto) {
    const plant = await this.prisma.myPlant.findUnique({ where: { id: Number(dto.myPlantId) } });
    if (!plant) throw new NotFoundException({ code: 404, message: '植物不存在' });
    if (plant.userId !== userId) throw new ForbiddenException({ code: 403, message: '无权限' });

    const diary = await this.prisma.diary.create({
      data: { userId, myPlantId: Number(dto.myPlantId), content: dto.content || null, imageUrl: dto.imageUrl || null },
      include: { myPlant: { select: { id: true, nickname: true } } },
    });

    return { id: diary.id.toString(), content: diary.content, imageUrl: diary.imageUrl, createdAt: diary.createdAt.toISOString() };
  }

  async delete(userId: number, diaryId: number) {
    const diary = await this.prisma.diary.findUnique({ where: { id: Number(diaryId) } });
    if (!diary) throw new NotFoundException({ code: 404, message: '日记不存在' });
    if (diary.userId !== userId) throw new ForbiddenException({ code: 403, message: '无权限' });
    await this.prisma.diary.delete({ where: { id: Number(diaryId) } });
    return { message: '删除成功' };
  }
}


