import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDiagnosisDto,
  QueryDiagnosisHistoryDto,
  QueryDiseasesDto,
} from './dto/diagnosis.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class DiagnosisService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 保存用户确认或人工选择后的诊断记录。
   * 自动图像诊断将在后续接入模型后复用该持久化入口。
   */
  async create(userId: number, dto: CreateDiagnosisDto) {
    if (!dto.pestDiseaseId && !dto.symptomDesc && !dto.imageUrl) {
      throw new BadRequestException({
        code: 400,
        message: '请至少提供病虫害知识、症状描述或诊断图片之一',
      });
    }

    if (dto.pestDiseaseId) {
      const disease = await this.prisma.pestDisease.findUnique({
        where: { id: dto.pestDiseaseId },
      });
      if (!disease) {
        throw new NotFoundException({ code: 404, message: '病虫害知识不存在' });
      }
    }

    const diagnosis = await this.prisma.diagnosis.create({
      data: {
        userId,
        pestDiseaseId: dto.pestDiseaseId ?? null,
        imageUrl: dto.imageUrl ?? null,
        symptomDesc: dto.symptomDesc ?? null,
        rawData: {
          source: 'manual',
          submittedAt: new Date().toISOString(),
        },
      },
      include: { pestDisease: true },
    });

    return this.serializeDiagnosis(diagnosis, true);
  }

  async getHistory(userId: number, query: QueryDiagnosisHistoryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = this.normalizePageSize(query.pageSize);
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.diagnosis.findMany({
        where: { userId },
        include: { pestDisease: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.diagnosis.count({ where: { userId } }),
    ]);

    return {
      items: items.map((item) => this.serializeDiagnosis(item, false)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(userId: number, diagnosisId: number) {
    const diagnosis = await this.prisma.diagnosis.findUnique({
      where: { id: diagnosisId },
      include: { pestDisease: true },
    });

    if (!diagnosis) {
      throw new NotFoundException({ code: 404, message: '诊断记录不存在' });
    }
    if (diagnosis.userId !== userId) {
      throw new ForbiddenException({ code: 403, message: '无权限查看该诊断记录' });
    }

    return this.serializeDiagnosis(diagnosis, true);
  }

  async listDiseases(query: QueryDiseasesDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = this.normalizePageSize(query.pageSize);
    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (query.q) {
      where.name = { contains: query.q };
    }
    if (query.type) {
      where.type = query.type;
    }

    const [items, total] = await Promise.all([
      this.prisma.pestDisease.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: pageSize,
      }),
      this.prisma.pestDisease.count({ where }),
    ]);

    return {
      items: items.map((item) => this.serializeDisease(item, false)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getDiseaseById(diseaseId: number) {
    const disease = await this.prisma.pestDisease.findUnique({
      where: { id: diseaseId },
    });
    if (!disease) {
      throw new NotFoundException({ code: 404, message: '病虫害知识不存在' });
    }

    return this.serializeDisease(disease, true);
  }

  private normalizePageSize(pageSize?: number) {
    return Math.min(pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  }

  private serializeDiagnosis(diagnosis: any, includeDetails: boolean) {
    return {
      id: diagnosis.id.toString(),
      imageUrl: diagnosis.imageUrl,
      symptomDesc: diagnosis.symptomDesc,
      createdAt: diagnosis.createdAt.toISOString(),
      ...(includeDetails && { rawData: diagnosis.rawData }),
      pestDisease: diagnosis.pestDisease
        ? this.serializeDisease(diagnosis.pestDisease, includeDetails)
        : null,
    };
  }

  private serializeDisease(disease: any, includeDetails: boolean) {
    return {
      id: disease.id.toString(),
      perenualId: disease.perenualId,
      name: disease.name,
      scientificName: disease.scientificName,
      type: disease.type,
      imageUrl: disease.imageUrl,
      ...(includeDetails && {
        description: disease.description,
        treatment: disease.treatment,
        rawData: disease.rawData,
      }),
    };
  }
}
