import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Inject } from '@nestjs/common';
import { RECOGNITION_HTTP_CLIENT, RecognitionHttpClient } from './recognition-http.client';

interface BaiduIdentifyResult {
  name: string;
  score: number;
  baikeInfo?: {
    imageUrl?: string;
    description?: string;
  };
}

interface PlantDetailResult {
  perenualId: number;
  name: string;
  scientificName?: string;
  family?: string;
  genus?: string;
  watering?: string;
  sunlight?: string;
  description?: string;
  imageUrl?: string;
  careGuide?: any;
  rawData?: any;
}

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
export class RecognitionService {
  private readonly logger = new Logger(RecognitionService.name);
  private baiduToken: string | null = null;
  private baiduTokenExpiry: number = 0;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @Inject(RECOGNITION_HTTP_CLIENT) private httpClient: RecognitionHttpClient,
  ) {}

  // ── 植物识别主流程 ──────────────────────────────────────
  async identify(userId: number, imageBase64: string) {
    // 1. 调用百度识花 API
    const identifyResult = await this.baiduIdentify(imageBase64);

    // 2. 尝试从本地数据库匹配植物种类
    let species = await this.prisma.plantSpecies.findFirst({
      where: {
        name: { contains: identifyResult.name },
      },
    });

    // 3. 本地没有，尝试从 Perenual 查询详情并缓存
    let plantDetail: PlantDetailResult | null = null;
    if (!species) {
      try {
        plantDetail = await this.searchPlantFromPerenual(identifyResult.name);
        if (plantDetail) {
          // 缓存到本地数据库
          species = await this.prisma.plantSpecies.upsert({
            where: { perenualId: plantDetail.perenualId },
            update: {
              name: plantDetail.name,
              scientificName: plantDetail.scientificName,
              family: plantDetail.family,
              genus: plantDetail.genus,
              watering: plantDetail.watering,
              sunlight: plantDetail.sunlight,
              description: plantDetail.description,
              imageUrl: plantDetail.imageUrl,
              careGuide: plantDetail.careGuide,
              rawData: plantDetail.rawData,
            },
            create: {
              perenualId: plantDetail.perenualId,
              name: plantDetail.name,
              scientificName: plantDetail.scientificName,
              family: plantDetail.family,
              genus: plantDetail.genus,
              watering: plantDetail.watering,
              sunlight: plantDetail.sunlight,
              description: plantDetail.description,
              imageUrl: plantDetail.imageUrl,
              careGuide: plantDetail.careGuide,
              rawData: plantDetail.rawData,
            },
          });
        }
      } catch (err) {
        this.logger.warn(`Perenual search failed for: ${identifyResult.name}`, (err as Error).message);
      }

      // 4. 如果 Perenual 也没有，至少用百度识别结果创建一个基础记录
      if (!species) {
        species = await this.prisma.plantSpecies.create({
          data: {
            name: identifyResult.name,
            description: identifyResult.baikeInfo?.description?.substring(0, 1024),
            imageUrl: identifyResult.baikeInfo?.imageUrl,
            rawData: { source: 'baidu', baikeInfo: identifyResult.baikeInfo },
          },
        });
        this.logger.log(`Created basic species from Baidu result: ${identifyResult.name}`);
      }
    }

    // 4. 保存识别记录
    const recognition = await this.prisma.recognition.create({
      data: {
        userId,
        speciesId: species?.id || null,
        imageUrl: identifyResult.baikeInfo?.imageUrl || null,
        confidence: identifyResult.score,
        rawName: identifyResult.name,
        rawData: JSON.parse(JSON.stringify({
          baikeInfo: identifyResult.baikeInfo,
          perenualDetail: plantDetail,
        })),
      },
      include: {
        species: true,
      },
    });

    return {
      recognition: {
        id: recognition.id.toString(),
        rawName: recognition.rawName,
        confidence: recognition.confidence,
        imageUrl: recognition.imageUrl,
        createdAt: recognition.createdAt.toISOString(),
      },
      species: species
        ? {
            id: species.id.toString(),
            name: species.name,
            scientificName: species.scientificName,
            family: species.family,
            genus: species.genus,
            watering: species.watering,
            sunlight: species.sunlight,
            description: species.description,
            imageUrl: species.imageUrl,
            careGuide: species.careGuide,
          }
        : null,
      baikeInfo: identifyResult.baikeInfo || null,
    };
  }

  // ── 获取识别历史 ────────────────────────────────────────
  async getHistory(userId: number, page?: number, pageSize?: number) {
    const pagination = normalizePagination(page, pageSize);
    const skip = (pagination.page - 1) * pagination.pageSize;

    const [records, total] = await Promise.all([
      this.prisma.recognition.findMany({
        where: { userId },
        include: {
          species: {
            select: { id: true, name: true, scientificName: true, imageUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.recognition.count({ where: { userId } }),
    ]);

    return {
      items: records.map((r) => ({
        id: r.id.toString(),
        rawName: r.rawName,
        confidence: r.confidence,
        imageUrl: r.imageUrl,
        createdAt: r.createdAt.toISOString(),
        species: r.species
          ? {
              id: r.species.id.toString(),
              name: r.species.name,
              scientificName: r.species.scientificName,
              imageUrl: r.species.imageUrl,
            }
          : null,
      })),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  // ── 搜索植物百科（Perenual）───────────────────────────
  async searchPlant(query: string, page?: number, pageSize?: number) {
    const pagination = normalizePagination(page, pageSize);
    const apiKey = this.config.get<string>('PERENUAL_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('Perenual API key 未配置');
    }

    const url = `https://perenual.com/api/v2/species-list?key=${apiKey}&page=${pagination.page}`;
    const response = await this.httpClient.request(url);

    if (!response.ok) {
      throw new InternalServerErrorException('Perenual API 请求失败');
    }

    const data = await response.json();
    const items = data.data || [];

    // 按关键词过滤
    const filtered = items.filter((item: any) => {
      const searchStr = `${item.common_name || ''} ${item.scientific_name || ''}`.toLowerCase();
      return searchStr.includes(query.toLowerCase());
    });

    return {
      items: filtered.map((item: any) => ({
        perenualId: item.id,
        name: item.common_name || 'Unknown',
        scientificName: Array.isArray(item.scientific_name)
          ? item.scientific_name[0]
          : item.scientific_name,
        imageUrl: item.default_image?.small_url || item.default_image?.regular_url,
        watering: item.watering,
        sunlight: item.sunlight,
      })),
      total: filtered.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  // ── 获取植物详情（Perenual）────────────────────────────
  async getPlantDetail(perenualId: number) {
    const apiKey = this.config.get<string>('PERENUAL_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('Perenual API key 未配置');
    }

    // 先查本地缓存
    let species = await this.prisma.plantSpecies.findUnique({
      where: { perenualId },
    });

    if (species) {
      return this.serializeSpecies(species);
    }

    // 本地没有，调用 Perenual API
    const url = `https://perenual.com/api/v2/species/details/${perenualId}?key=${apiKey}`;
    const response = await this.httpClient.request(url);

    if (!response.ok) {
      throw new BadRequestException('植物不存在或 API 请求失败');
    }

    const data = await response.json();

    // 缓存到本地
    species = await this.prisma.plantSpecies.create({
      data: {
        perenualId: data.id,
        name: data.common_name || 'Unknown',
        scientificName: Array.isArray(data.scientific_name)
          ? data.scientific_name[0]
          : data.scientific_name,
        family: data.family,
        genus: data.genus,
        watering: data.watering,
        sunlight: Array.isArray(data.sunlight) ? data.sunlight.join(', ') : data.sunlight,
        description: data.description?.substring(0, 1024),
        imageUrl: data.default_image?.regular_url,
        careGuide: data,
        rawData: data,
      },
    });

    return this.serializeSpecies(species);
  }

  // ── 百度识花 API ────────────────────────────────────────
  private async baiduIdentify(imageBase64: string): Promise<BaiduIdentifyResult> {
    const token = await this.getBaiduToken();

    // 清理 Base64 字符串（移除 data URI 前缀和换行符）
    const cleanBase64 = imageBase64
      .replace(/^data:image\/[a-z]+;base64,/, '')
      .replace(/\s/g, '');

    const url = `https://aip.baidubce.com/rest/2.0/image-classify/v1/plant?access_token=${token}`;
    
    // 百度 API 要求使用 application/x-www-form-urlencoded 格式
    const params = new URLSearchParams();
    params.append('image', cleanBase64);
    params.append('baike_num', '5');

    const response = await this.httpClient.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new InternalServerErrorException('百度识花 API 返回格式异常');
    }

    // 错误处理
    if (data.error_code) {
      this.logger.error(`百度识花错误: ${data.error_code} - ${data.error_msg}`);
      if (data.error_code === 110 || data.error_code === 111) {
        this.baiduToken = null; // token 失效，下次重新获取
        throw new InternalServerErrorException('百度 AI Token 失效，请稍后重试');
      }
      throw new InternalServerErrorException(`百度识花失败: ${data.error_msg}`);
    }

    if (!data.result || data.result.length === 0) {
      throw new BadRequestException({
        code: 'NO_RESULT',
        message: '未能识别出植物，请尝试更清晰的图片',
      });
    }

    const top = data.result[0];
    return {
      name: top.name,
      score: Math.round(top.score * 100),
      baikeInfo: top.baike_info
        ? {
            imageUrl: top.baike_info.image_url,
            description: top.baike_info.description,
          }
        : undefined,
    };
  }

  // ── 获取百度 Token ──────────────────────────────────────
  private async getBaiduToken(): Promise<string> {
    // 缓存有效则直接返回
    if (this.baiduToken && Date.now() < this.baiduTokenExpiry) {
      return this.baiduToken;
    }

    const apiKey = this.config.get<string>('BAIDU_AI_API_KEY');
    const secretKey = this.config.get<string>('BAIDU_AI_SECRET_KEY');

    if (!apiKey || !secretKey) {
      throw new InternalServerErrorException('百度 AI API key 未配置');
    }

    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
    const response = await this.httpClient.request(url, { method: 'POST' });
    const data = await response.json();

    if (!data.access_token) {
      throw new InternalServerErrorException('获取百度 Token 失败');
    }

    // 缓存 25 天（有效期 30 天，提前刷新）
    this.baiduToken = data.access_token;
    this.baiduTokenExpiry = Date.now() + 25 * 24 * 60 * 60 * 1000;

    return this.baiduToken;
  }

  // ── 从 Perenual 搜索植物 ────────────────────────────────
  private async searchPlantFromPerenual(name: string): Promise<PlantDetailResult | null> {
    const apiKey = this.config.get<string>('PERENUAL_API_KEY');
    if (!apiKey) return null;

    // 先搜索列表
    const searchUrl = `https://perenual.com/api/v2/species-list?key=${apiKey}&page=1`;
    const searchRes = await this.httpClient.request(searchUrl);
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const items = searchData.data || [];

    // 模糊匹配
    const matched = items.find((item: any) => {
      const searchStr = `${item.common_name || ''} ${(item.scientific_name || []).join(' ')}`.toLowerCase();
      return searchStr.includes(name.toLowerCase());
    });

    if (!matched) return null;

    // 获取详情
    return this.getPlantDetailFromPerenual(apiKey, matched.id);
  }

  private async getPlantDetailFromPerenual(apiKey: string, id: number): Promise<PlantDetailResult | null> {
    const url = `https://perenual.com/api/v2/species/details/${id}?key=${apiKey}`;
    const response = await this.httpClient.request(url);
    if (!response.ok) return null;

    const data = await response.json();

    return {
      perenualId: data.id,
      name: data.common_name || 'Unknown',
      scientificName: Array.isArray(data.scientific_name)
        ? data.scientific_name[0]
        : data.scientific_name,
      family: data.family,
      genus: data.genus,
      watering: data.watering,
      sunlight: Array.isArray(data.sunlight) ? data.sunlight.join(', ') : data.sunlight,
      description: data.description?.substring(0, 1024),
      imageUrl: data.default_image?.regular_url,
      careGuide: data,
      rawData: data,
    };
  }

  private serializeSpecies(species: any) {
    return {
      id: species.id.toString(),
      perenualId: species.perenualId,
      name: species.name,
      scientificName: species.scientificName,
      family: species.family,
      genus: species.genus,
      watering: species.watering,
      sunlight: species.sunlight,
      description: species.description,
      imageUrl: species.imageUrl,
      careGuide: species.careGuide,
    };
  }
}

