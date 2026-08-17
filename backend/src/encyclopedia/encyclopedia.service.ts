import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryEncyclopediaDto } from './dto/encyclopedia.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class EncyclopediaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查询植物百科列表，支持名称/学名关键词搜索、科属筛选、浇水/光照筛选和分页。
   */
  async list(query: QueryEncyclopediaDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = this.normalizePageSize(query.pageSize);
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.q) {
      where.OR = [
        { name: { contains: query.q } },
        { scientificName: { contains: query.q } },
      ];
    }

    if (query.family) {
      where.family = { contains: query.family };
    }

    if (query.genus) {
      where.genus = { contains: query.genus };
    }

    if (query.watering) {
      where.watering = { contains: query.watering };
    }

    if (query.sunlight) {
      where.sunlight = { contains: query.sunlight };
    }

    const [total, items] = await Promise.all([
      this.prisma.plantSpecies.count({ where }),
      this.prisma.plantSpecies.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      items: items.map((s) => this.serializeSpecies(s, false)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取植物百科详情，包含完整的养护指南和原始数据。
   */
  async getById(id: number) {
    const species = await this.prisma.plantSpecies.findUnique({
      where: { id },
    });

    if (!species) {
      throw new NotFoundException({
        code: 404,
        message: '植物种类不存在',
      });
    }

    return this.serializeSpecies(species, true);
  }

  private normalizePageSize(pageSize?: number) {
    return Math.min(pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  }

  private serializeSpecies(species: any, includeDetails: boolean) {
    return {
      id: species.id.toString(),
      perenualId: species.perenualId,
      name: species.name,
      scientificName: species.scientificName,
      family: species.family,
      genus: species.genus,
      watering: species.watering,
      sunlight: species.sunlight,
      imageUrl: species.imageUrl,
      ...(includeDetails && {
        description: species.description,
        careGuide: species.careGuide,
        rawData: species.rawData,
      }),
    };
  }
}
