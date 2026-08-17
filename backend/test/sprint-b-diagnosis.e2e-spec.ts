import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearTestDatabase, createTestApp } from './test-app';

describe('Sprint B - Diagnosis Module', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let user1Token: string;
  let user2Token: string;
  let diseaseId: number;
  let diagnosisId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    await clearTestDatabase(prisma);

    // 创建测试病虫害知识
    const disease = await prisma.pestDisease.create({
      data: {
        name: '叶斑病',
        scientificName: 'Leaf Spot Disease',
        type: 'disease',
        description: '叶片出现褐色或黑色圆形斑点',
        treatment: '剪除病叶，喷洒杀菌剂',
        imageUrl: 'https://example.com/leaf-spot.jpg',
        rawData: { source: 'seed' },
      },
    });
    diseaseId = disease.id;

    // 创建第二个病虫害知识（用于测试列表）
    await prisma.pestDisease.create({
      data: {
        name: '蚜虫',
        scientificName: 'Aphid',
        type: 'pest',
        description: '小型绿色或黑色昆虫，聚集在嫩叶和茎上',
        treatment: '喷洒肥皂水或使用天敌（瓢虫）',
        imageUrl: 'https://example.com/aphid.jpg',
        rawData: { source: 'seed' },
      },
    });

    // 创建两个测试用户
    const user1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ username: 'diaguser1', password: 'pass123456' })
      .expect(201);
    user1Token = user1.body.tokens.accessToken;

    const user2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ username: 'diaguser2', password: 'pass123456' })
      .expect(201);
    user2Token = user2.body.tokens.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('病虫害知识库 API', () => {
    it('应该返回病虫害知识库列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/diagnosis/diseases')
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.items[0]).toHaveProperty('id');
      expect(response.body.items[0]).toHaveProperty('name');
      expect(response.body.items[0]).toHaveProperty('type');
      // 列表接口不应包含详细字段
      expect(response.body.items[0]).not.toHaveProperty('description');
    });

    it('应该支持按名称关键词筛选', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/diagnosis/diseases')
        .query({ q: '叶斑' })
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].name).toContain('叶斑');
    });

    it('应该支持按类型筛选', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/diagnosis/diseases')
        .query({ type: 'pest' })
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].type).toBe('pest');
    });

    it('应该返回病虫害知识详情', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/diagnosis/diseases/${diseaseId}`)
        .expect(200);

      expect(response.body.name).toBe('叶斑病');
      expect(response.body.scientificName).toBe('Leaf Spot Disease');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('treatment');
      expect(response.body.description).toBe('叶片出现褐色或黑色圆形斑点');
    });

    it('查询不存在的病虫害知识应返回 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/diagnosis/diseases/99999')
        .expect(404);
    });
  });

  describe('诊断记录 API', () => {
    it('应该成功创建诊断记录（关联病虫害知识）', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/diagnosis')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          pestDiseaseId: diseaseId,
          symptomDesc: '我的绿萝叶子上出现了褐色斑点',
          imageUrl: 'https://example.com/my-plant-issue.jpg',
        })
        .expect(201);

      expect(response.body.id).toEqual(expect.any(String));
      expect(response.body.symptomDesc).toBe('我的绿萝叶子上出现了褐色斑点');
      expect(response.body.pestDisease).toMatchObject({
        id: diseaseId.toString(),
        name: '叶斑病',
      });
      expect(response.body).toHaveProperty('rawData');
      expect(response.body.rawData.source).toBe('manual');

      diagnosisId = response.body.id;
    });

    it('应该成功创建诊断记录（仅症状描述）', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/diagnosis')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          symptomDesc: '叶片发黄，不确定原因',
        })
        .expect(201);

      expect(response.body.id).toEqual(expect.any(String));
      expect(response.body.symptomDesc).toBe('叶片发黄，不确定原因');
      expect(response.body.pestDisease).toBeNull();
    });

    it('应该拒绝空诊断记录', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/diagnosis')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('至少提供');
    });

    it('应该拒绝不存在的病虫害知识 ID', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/diagnosis')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          pestDiseaseId: 99999,
          symptomDesc: '测试',
        })
        .expect(404);
    });

    it('未登录用户无法创建诊断记录', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/diagnosis')
        .send({ symptomDesc: '测试' })
        .expect(401);
    });
  });

  describe('诊断历史 API', () => {
    it('应该返回当前用户的诊断历史', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/diagnosis/history')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.page).toBe(1);
      // 历史列表不应包含 rawData
      expect(response.body.items[0]).not.toHaveProperty('rawData');
    });

    it('不同用户的诊断历史应隔离', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/diagnosis/history')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(response.body.items).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('应该支持分页', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/diagnosis/history')
        .set('Authorization', `Bearer ${user1Token}`)
        .query({ page: 1, pageSize: 1 })
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.pageSize).toBe(1);
      expect(response.body.totalPages).toBe(2);
    });

    it('未登录用户无法查看诊断历史', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/diagnosis/history')
        .expect(401);
    });
  });

  describe('诊断详情 API', () => {
    it('应该返回诊断记录详情', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/diagnosis/${diagnosisId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.id).toBe(diagnosisId);
      expect(response.body.symptomDesc).toBe('我的绿萝叶子上出现了褐色斑点');
      expect(response.body).toHaveProperty('rawData');
      expect(response.body.pestDisease).toMatchObject({
        name: '叶斑病',
        description: '叶片出现褐色或黑色圆形斑点',
        treatment: '剪除病叶，喷洒杀菌剂',
      });
    });

    it('其他用户无法查看非本人的诊断记录', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/diagnosis/${diagnosisId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.code).toBe(403);
      expect(response.body.message).toContain('无权限');
    });

    it('查询不存在的诊断记录应返回 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/diagnosis/99999')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it('未登录用户无法查看诊断详情', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/diagnosis/${diagnosisId}`)
        .expect(401);
    });
  });
});
