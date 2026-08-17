import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddFavoriteDto } from './dto/favorites.dto';

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
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async list(userId: number, category?: string, page?: number, pageSize?: number) {
    const pagination = normalizePagination(page, pageSize);
    const skip = (pagination.page - 1) * pagination.pageSize;
    const where: any = { userId };
    if (category) where.category = category;

    const [items, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        include: { species: { select: { id: true, name: true, scientificName: true, imageUrl: true, watering: true, sunlight: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: pagination.pageSize,
      }),
      this.prisma.favorite.count({ where }),
    ]);

    return {
      items: items.map((f) => ({
        id: f.id.toString(), category: f.category, createdAt: f.createdAt.toISOString(),
        species: { id: f.species.id.toString(), name: f.species.name, scientificName: f.species.scientificName, imageUrl: f.species.imageUrl, watering: f.species.watering, sunlight: f.species.sunlight },
      })),
      total, page: pagination.page, pageSize: pagination.pageSize, totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  async add(userId: number, dto: AddFavoriteDto) {
    const species = await this.prisma.plantSpecies.findUnique({ where: { id: Number(dto.speciesId) } });
    if (!species) throw new NotFoundException({ code: 404, message: '植物种类不存在' });

    const exists = await this.prisma.favorite.findUnique({ where: { userId_speciesId: { userId, speciesId: Number(dto.speciesId) } } });
    if (exists) throw new ConflictException({ code: 409, message: '已收藏该植物' });

    const fav = await this.prisma.favorite.create({
      data: { userId, speciesId: Number(dto.speciesId), category: dto.category || null },
      include: { species: { select: { id: true, name: true, imageUrl: true } } },
    });

    return { id: fav.id.toString(), category: fav.category, createdAt: fav.createdAt.toISOString(), species: { id: fav.species.id.toString(), name: fav.species.name, imageUrl: fav.species.imageUrl } };
  }

  async remove(userId: number, speciesId: number) {
    const fav = await this.prisma.favorite.findUnique({ where: { userId_speciesId: { userId, speciesId: Number(speciesId) } } });
    if (!fav) throw new NotFoundException({ code: 404, message: '收藏不存在' });
    await this.prisma.favorite.delete({ where: { id: fav.id } });
    return { message: '取消收藏成功' };
  }
}


