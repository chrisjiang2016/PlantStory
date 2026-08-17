import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddPlantDto, UpdatePlantDto } from './dto/garden.dto';

@Injectable()
export class GardenService {
  constructor(private prisma: PrismaService) {}

  // ── 获取用户花园列表 ────────────────────────────────────
  async listPlants(userId: number) {
    const plants = await this.prisma.myPlant.findMany({
      where: { userId },
      include: {
        species: {
          select: {
            id: true,
            name: true,
            scientificName: true,
            imageUrl: true,
            watering: true,
            sunlight: true,
          },
        },
        careLogs: {
          orderBy: { performedAt: 'desc' },
          take: 1, // 最近一次养护
          select: {
            careType: true,
            performedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return plants.map((p) => this.serializePlant(p));
  }

  // ── 获取单个植物详情 ────────────────────────────────────
  async getPlant(userId: number, plantId: number) {
    const plant = await this.prisma.myPlant.findUnique({
      where: { id: Number(plantId) },
      include: {
        species: true,
        careLogs: {
          orderBy: { performedAt: 'desc' },
          take: 10,
        },
        diaries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        reminders: {
          where: { isCompleted: false },
          orderBy: { remindAt: 'asc' },
        },
      },
    });

    if (!plant) {
      throw new NotFoundException({ code: 404, message: '植物不存在' });
    }

    if (plant.userId !== userId) {
      throw new ForbiddenException({ code: 403, message: '无权限访问该植物' });
    }

    return this.serializePlantDetail(plant);
  }

  // ── 添加植物到花园 ──────────────────────────────────────
  async addPlant(userId: number, dto: AddPlantDto) {
    // 验证植物种类存在
    const species = await this.prisma.plantSpecies.findUnique({
      where: { id: Number(dto.speciesId) },
    });

    if (!species) {
      throw new NotFoundException({ code: 404, message: '植物种类不存在' });
    }

    const plant = await this.prisma.myPlant.create({
      data: {
        userId,
        speciesId: Number(dto.speciesId),
        nickname: dto.nickname || null,
        location: dto.location || null,
        currentStage: dto.currentStage || 'seed',
        plantedAt: dto.plantedAt ? new Date(dto.plantedAt) : new Date(),
        photoUrl: dto.photoUrl || null,
      },
      include: {
        species: {
          select: { id: true, name: true, scientificName: true, imageUrl: true },
        },
      },
    });

    return this.serializePlant(plant);
  }

  // ── 更新植物信息 ────────────────────────────────────────
  async updatePlant(userId: number, plantId: number, dto: UpdatePlantDto) {
    const existing = await this.prisma.myPlant.findUnique({
      where: { id: Number(plantId) },
    });

    if (!existing) {
      throw new NotFoundException({ code: 404, message: '植物不存在' });
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException({ code: 403, message: '无权限修改该植物' });
    }

    const plant = await this.prisma.myPlant.update({
      where: { id: Number(plantId) },
      data: {
        ...(dto.nickname !== undefined && { nickname: dto.nickname }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.currentStage !== undefined && { currentStage: dto.currentStage }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
      },
      include: {
        species: {
          select: { id: true, name: true, scientificName: true, imageUrl: true },
        },
      },
    });

    return this.serializePlant(plant);
  }

  // ── 删除植物 ────────────────────────────────────────────
  async removePlant(userId: number, plantId: number) {
    const existing = await this.prisma.myPlant.findUnique({
      where: { id: Number(plantId) },
    });

    if (!existing) {
      throw new NotFoundException({ code: 404, message: '植物不存在' });
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException({ code: 403, message: '无权限删除该植物' });
    }

    // 级联删除关联数据
    await this.prisma.$transaction([
      this.prisma.reminder.deleteMany({ where: { myPlantId: Number(plantId) } }),
      this.prisma.diary.deleteMany({ where: { myPlantId: Number(plantId) } }),
      this.prisma.careLog.deleteMany({ where: { myPlantId: Number(plantId) } }),
      this.prisma.myPlant.delete({ where: { id: Number(plantId) } }),
    ]);

    return { message: '删除成功' };
  }

  // ── 序列化工具 ──────────────────────────────────────────

  private serializePlant(plant: any) {
    return {
      id: plant.id.toString(),
      nickname: plant.nickname,
      location: plant.location,
      currentStage: plant.currentStage,
      plantedAt: plant.plantedAt?.toISOString?.() || plant.plantedAt,
      photoUrl: plant.photoUrl,
      createdAt: plant.createdAt?.toISOString?.() || plant.createdAt,
      species: plant.species
        ? {
            id: plant.species.id.toString(),
            name: plant.species.name,
            scientificName: plant.species.scientificName,
            imageUrl: plant.species.imageUrl,
            ...(plant.species.watering && { watering: plant.species.watering }),
            ...(plant.species.sunlight && { sunlight: plant.species.sunlight }),
          }
        : null,
      lastCare: plant.careLogs?.[0]
        ? {
            careType: plant.careLogs[0].careType,
            performedAt: plant.careLogs[0].performedAt?.toISOString?.() || plant.careLogs[0].performedAt,
          }
        : null,
    };
  }

  private serializePlantDetail(plant: any) {
    return {
      ...this.serializePlant(plant),
      species: plant.species
        ? {
            id: plant.species.id.toString(),
            name: plant.species.name,
            scientificName: plant.species.scientificName,
            family: plant.species.family,
            genus: plant.species.genus,
            watering: plant.species.watering,
            sunlight: plant.species.sunlight,
            description: plant.species.description,
            imageUrl: plant.species.imageUrl,
            careGuide: plant.species.careGuide,
          }
        : null,
      careLogs: (plant.careLogs || []).map((log: any) => ({
        id: log.id.toString(),
        careType: log.careType,
        note: log.note,
        performedAt: log.performedAt?.toISOString?.() || log.performedAt,
      })),
      diaries: (plant.diaries || []).map((d: any) => ({
        id: d.id.toString(),
        content: d.content,
        imageUrl: d.imageUrl,
        createdAt: d.createdAt?.toISOString?.() || d.createdAt,
      })),
      reminders: (plant.reminders || []).map((r: any) => ({
        id: r.id.toString(),
        title: r.title,
        careType: r.careType,
        remindAt: r.remindAt?.toISOString?.() || r.remindAt,
        repeatRule: r.repeatRule,
      })),
    };
  }
}


