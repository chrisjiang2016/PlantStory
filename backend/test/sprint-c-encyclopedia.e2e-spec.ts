import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearTestDatabase, createTestApp } from './test-app';

describe('Sprint C - Encyclopedia Module', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let speciesId1: number;
  let speciesId2: number;
  let speciesId3: number;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    await clearTestDatabase(prisma);

    // 创建测试植物种类数据
    const species1 = await prisma.plantSpecies.create({
      data: {
        name: '绿萝',
        scientificName: 'Epipremnum aureum',
        family: 'Araceae',
        genus: 'Epipremnum',
        watering: 'Average',
        sunlight: 'Partial shade',
        description: '绿萝是一种常见的室内观叶植物，叶片翠绿，易于养护。',
        careGuide: '保持土壤微湿，避免强光直射，定期喷水保持湿度。',
        imageUrl: 'https://example.com/pothos.jpg',
        rawData: { source: 'seed', difficulty: 'easy' },
      },
    });
    speciesId1 = species1.id;

    const species2 = await prisma.plantSpecies.create({
      data: {
        name: '虎皮兰',
        scientificName: 'Sansevieria trifasciata',
        family: 'Asparagaceae',
        genus: 'Sansevieria',
        watering: 'Low',
        sunlight: 'Full sun',
        description: '虎皮兰叶片挺拔，耐旱耐阴，是优秀的空气净化植物。',
        careGuide: '浇水宁少勿多，夏季每周一次，冬季减少浇水。',
        imageUrl: 'https://example.com/snake-plant.jpg',
        rawData: { source: 'seed', difficulty: 'easy' },
      },
    });
    speciesId2 = species2.id;

    const species3 = await prisma.plantSpecies.create({
      data: {
        name: '多肉植物',
        scientificName: 'Crassula ovata',
        family: 'Crassulaceae',
        genus: 'Crassula',
        watering: 'Low',
        sunlight: 'Full sun',
        description: '多肉植物叶片肥厚，储水能力强，适合懒人养护。',
        careGuide: '春秋生长季每周浇一次水，夏季休眠期减少浇水。',
        imageUrl: 'https://example.com/jade-plant.jpg',
        rawData: { source: 'seed', difficulty: 'easy' },
      },
    });
    speciesId3 = species3.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('植物百科列表 API', () => {
    it('应该返回植物百科列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/encyclopedia')
        .expect(200);

      expect(response.body.items).toHaveLength(3);
      expect(response.body.total).toBe(3);
      expect(response.body.page).toBe(1);
      expect(response.body.items[0]).toHaveProperty('id');
      expect(response.body.items[0]).toHaveProperty('name');
      expect(response.body.items[0]).toHaveProperty('scientificName');
      expect(response.body.items[0]).toHaveProperty('family');
      // 列表接口不应包含详细字段
      expect(response.body.items[0]).not.toHaveProperty('description');
      expect(response.body.items[0]).not.toHaveProperty('careGuide');
    });

    it('应该支持按名称关键词搜索', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/encyclopedia')
        .query({ q: '绿萝' })
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].name).toBe('绿萝');
    });

    it('应该支持按学名关键词搜索', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/encyclopedia')
        .query({ q: 'Sansevieria' })
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].scientificName).toContain('Sansevieria');
    });

    it('应该支持按科（family）筛选', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/encyclopedia')
        .query({ family: 'Araceae' })
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].family).toBe('Araceae');
    });

    it('应该支持按属（genus）筛选', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/encyclopedia')
        .query({ genus: 'Epipremnum' })
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].genus).toBe('Epipremnum');
    });

    it('应该支持按浇水频率筛选', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/encyclopedia')
        .query({ watering: 'Low' })
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.items.every((s: any) => s.watering === 'Low')).toBe(true);
    });

    it('应该支持按光照需求筛选', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/encyclopedia')
        .query({ sunlight: 'Full sun' })
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.items.every((s: any) => s.sunlight === 'Full sun')).toBe(true);
    });

    it('应该支持组合条件筛选', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/encyclopedia')
        .query({ watering: 'Low', sunlight: 'Full sun' })
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.items.every((s: any) => 
        s.watering === 'Low' && s.sunlight === 'Full sun'
      )).toBe(true);
    });

    it('应该支持分页', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/encyclopedia')
        .query({ page: 1, pageSize: 2 })
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.pageSize).toBe(2);
      expect(response.body.totalPages).toBe(2);
    });

    it('空结果应返回空列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/encyclopedia')
        .query({ q: '不存在的植物' })
        .expect(200);

      expect(response.body.items).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });
  });

  describe('植物百科详情 API', () => {
    it('应该返回植物百科详情', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/encyclopedia/${speciesId1}`)
        .expect(200);

      expect(response.body.name).toBe('绿萝');
      expect(response.body.scientificName).toBe('Epipremnum aureum');
      expect(response.body.family).toBe('Araceae');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('careGuide');
      expect(response.body).toHaveProperty('rawData');
      expect(response.body.description).toBe('绿萝是一种常见的室内观叶植物，叶片翠绿，易于养护。');
      expect(response.body.careGuide).toBe('保持土壤微湿，避免强光直射，定期喷水保持湿度。');
    });

    it('查询不存在的植物应返回 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/encyclopedia/99999')
        .expect(404);

      expect(response.body.code).toBe(404);
      expect(response.body.message).toContain('不存在');
    });
  });
});
