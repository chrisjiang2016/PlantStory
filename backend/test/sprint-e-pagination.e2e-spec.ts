import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearTestDatabase, createTestApp } from './test-app';
import { RECOGNITION_HTTP_CLIENT } from '../src/recognition/recognition-http.client';

describe('Sprint E - Pagination query boundaries', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let speciesId: number;
  let favoriteSpeciesIds: number[];
  let plantId: string;
  let recognitionHttpClient: { request: jest.Mock };

  beforeAll(async () => {
    recognitionHttpClient = {
      request: jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          data: [
            { id: 10, common_name: 'Pothos', scientific_name: ['Epipremnum aureum'], watering: 'Average', sunlight: ['part shade'] },
          ],
        })),
      ),
    };
    app = await createTestApp([
      { token: RECOGNITION_HTTP_CLIENT, value: recognitionHttpClient },
    ]);
    prisma = app.get(PrismaService);

    await clearTestDatabase(prisma);

    const species = await prisma.plantSpecies.create({
      data: {
        name: 'Sprint E 绿萝',
        scientificName: 'Epipremnum aureum',
        family: 'Araceae',
        genus: 'Epipremnum',
        watering: 'Average',
        sunlight: 'Part shade',
      },
    });
    const favoriteSpeciesA = await prisma.plantSpecies.create({
      data: { name: 'Sprint E 龟背竹', scientificName: 'Monstera deliciosa' },
    });
    const favoriteSpeciesB = await prisma.plantSpecies.create({
      data: { name: 'Sprint E 吊兰', scientificName: 'Chlorophytum comosum' },
    });
    speciesId = species.id;
    favoriteSpeciesIds = [species.id, favoriteSpeciesA.id, favoriteSpeciesB.id];

    await prisma.pestDisease.createMany({
      data: [
        { name: '叶斑病', type: 'disease', description: '叶片斑点' },
        { name: '蚜虫', type: 'pest', description: '虫害' },
      ],
    });

    const user = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ username: 'sprintepage', password: 'pass123456' })
      .expect(201);
    token = user.body.tokens.accessToken;
    const userId = Number(user.body.user.id);

    const plant = await request(app.getHttpServer())
      .post('/api/v1/garden/plants')
      .set('Authorization', `Bearer ${token}`)
      .send({ speciesId, nickname: '分页测试植物' })
      .expect(201);
    plantId = plant.body.id;

    await prisma.reminder.createMany({
      data: [1, 2, 3].map((i) => ({
        userId,
        myPlantId: Number(plantId),
        title: `已完成提醒 ${i}`,
        remindAt: new Date(`2030-01-0${i}T09:00:00.000Z`),
        isCompleted: true,
        completedAt: new Date(`2030-01-0${i}T10:00:00.000Z`),
      })),
    });

    await prisma.careLog.createMany({
      data: [1, 2, 3].map((i) => ({
        userId,
        myPlantId: Number(plantId),
        careType: 'water',
        note: `养护 ${i}`,
        performedAt: new Date(`2030-01-0${i}T08:00:00.000Z`),
      })),
    });

    await prisma.diary.createMany({
      data: [1, 2, 3].map((i) => ({
        userId,
        myPlantId: Number(plantId),
        content: `日记 ${i}`,
      })),
    });

    await prisma.favorite.createMany({
      data: favoriteSpeciesIds.map((id) => ({ userId, speciesId: id, category: 'beginner' })),
    });

    await prisma.recognition.createMany({
      data: [1, 2, 3].map((i) => ({
        userId,
        speciesId,
        rawName: `识别 ${i}`,
        confidence: 0.9,
      })),
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it.each([
    ['/api/v1/reminders/completed', 'completed reminders'],
    ['/api/v1/care-logs', 'care logs'],
    ['/api/v1/diaries', 'diaries'],
    ['/api/v1/favorites', 'favorites'],
    ['/api/v1/recognition/history', 'recognition history'],
    ['/api/v1/diagnosis/history', 'diagnosis history'],
  ])('converts pagination query strings for %s', async (path) => {
    const response = await request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .query({ page: '2', pageSize: '1' })
      .expect(200);

    expect(response.body.page).toBe(2);
    expect(response.body.pageSize).toBe(1);
    expect(response.body.items).toHaveLength(Math.min(1, response.body.total));
  });

  it.each([
    ['/api/v1/reminders/completed', 'completed reminders'],
    ['/api/v1/care-logs', 'care logs'],
    ['/api/v1/diaries', 'diaries'],
    ['/api/v1/favorites', 'favorites'],
    ['/api/v1/recognition/history', 'recognition history'],
    ['/api/v1/diagnosis/history', 'diagnosis history'],
    ['/api/v1/diagnosis/diseases', 'diagnosis diseases'],
    ['/api/v1/encyclopedia', 'encyclopedia'],
  ])('rejects invalid page for %s', async (path) => {
    await request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .query({ page: '0' })
      .expect(400);

    await request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .query({ page: 'abc' })
      .expect(400);
  });

  it.each([
    ['/api/v1/reminders/completed', 'completed reminders'],
    ['/api/v1/care-logs', 'care logs'],
    ['/api/v1/diaries', 'diaries'],
    ['/api/v1/favorites', 'favorites'],
    ['/api/v1/recognition/history', 'recognition history'],
    ['/api/v1/diagnosis/history', 'diagnosis history'],
    ['/api/v1/diagnosis/diseases', 'diagnosis diseases'],
    ['/api/v1/encyclopedia', 'encyclopedia'],
  ])('rejects invalid pageSize for %s', async (path) => {
    await request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .query({ pageSize: '0' })
      .expect(400);

    await request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .query({ pageSize: '101' })
      .expect(400);
  });

  it('converts plantId filter instead of treating query text as truthy string', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/care-logs')
      .set('Authorization', `Bearer ${token}`)
      .query({ plantId: String(plantId), page: '1', pageSize: '2' })
      .expect(200);

    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(2);
    expect(response.body.total).toBe(3);
    expect(response.body.items).toHaveLength(2);
  });

  it('rejects invalid plantId filters', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/diaries')
      .set('Authorization', `Bearer ${token}`)
      .query({ plantId: 'abc' })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/v1/care-logs')
      .set('Authorization', `Bearer ${token}`)
      .query({ plantId: '0' })
      .expect(400);
  });

  it('validates public recognition search query and page', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/recognition/search')
      .query({ page: 'abc' })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/v1/recognition/search')
      .query({ q: '绿萝', page: '0' })
      .expect(400);
  });
});
