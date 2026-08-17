import { INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearTestDatabase, createTestApp } from './test-app';
import { RECOGNITION_HTTP_CLIENT } from '../src/recognition/recognition-http.client';

describe('Sprint D - Core modules', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let user1Token: string;
  let user2Token: string;
  let user1Id: number;
  let user2Id: number;
  let speciesId: number;
  let plantId: string;
  let reminderId: string;
  let diaryId: string;
  let careLogId: string;
  let recognitionHttpClient: { request: jest.Mock };
  let recognitionErrorLogSpy: jest.SpyInstance;

  beforeAll(async () => {
    recognitionErrorLogSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    recognitionHttpClient = {
      request: jest.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token' })))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          error_code: 216101,
          error_msg: 'param image not exist',
        }))),
    };
    app = await createTestApp([
      { token: RECOGNITION_HTTP_CLIENT, value: recognitionHttpClient },
    ]);
    prisma = app.get(PrismaService);

    await clearTestDatabase(prisma);

    const species = await prisma.plantSpecies.create({
      data: {
        name: 'Sprint D 绿萝',
        scientificName: 'Epipremnum aureum',
        imageUrl: 'https://example.com/pothos.jpg',
      },
    });
    speciesId = species.id;

    await prisma.achievement.createMany({
      data: [
        { code: 'first-plant', name: '第一盆植物', conditionType: 'plant_count', conditionValue: 1 },
        { code: 'water-once', name: '首次浇水', conditionType: 'care_count:water', conditionValue: 1 },
      ],
    });

    const user1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ username: 'sprintduser1', password: 'pass123456' })
      .expect(201);
    user1Token = user1.body.tokens.accessToken;
    user1Id = Number(user1.body.user.id);

    const user2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ username: 'sprintduser2', password: 'pass123456' })
      .expect(201);
    user2Token = user2.body.tokens.accessToken;
    user2Id = Number(user2.body.user.id);

    const plant = await request(app.getHttpServer())
      .post('/api/v1/garden/plants')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ speciesId, nickname: 'Sprint D 小绿', location: '阳台' })
      .expect(201);
    plantId = plant.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
    recognitionErrorLogSpy.mockRestore();
  });

  describe('Reminders', () => {
    it('creates and lists a reminder for the current user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/reminders')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: '给小绿浇水', remindAt: '2030-01-02T09:00:00.000Z', myPlantId: Number(plantId), careType: 'water', repeatRule: 'daily' })
        .expect(201);

      expect(response.body).toMatchObject({ title: '给小绿浇水', repeatRule: 'daily' });
      expect(response.body.myPlant.id).toBe(plantId);
      reminderId = response.body.id;

      const list = await request(app.getHttpServer())
        .get('/api/v1/reminders')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0].id).toBe(reminderId);
    });

    it('isolates reminders between users', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/reminders')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);
      expect(list.body).toHaveLength(0);
    });

    it('completes a repeated reminder and creates the next occurrence', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/reminders/${reminderId}/complete`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const rows = await prisma.reminder.findMany({ where: { userId: user1Id }, orderBy: { id: 'asc' } });
      expect(rows).toHaveLength(2);
      expect(rows[0].isCompleted).toBe(true);
      expect(rows[1].isCompleted).toBe(false);
      expect(rows[1].remindAt.toISOString()).toBe('2030-01-03T09:00:00.000Z');
    });

    it('rejects another user updating the reminder', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/reminders/${reminderId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ title: '越权修改' })
        .expect(403);
    });
  });

  describe('Care logs', () => {
    it('creates and lists a care log', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/care-logs')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ myPlantId: Number(plantId), careType: 'water', note: '浇了一杯水', performedAt: '2030-01-01T08:00:00.000Z' })
        .expect(201);
      expect(response.body).toMatchObject({ careType: 'water', note: '浇了一杯水' });
      careLogId = response.body.id;

      const list = await request(app.getHttpServer())
        .get('/api/v1/care-logs')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(list.body.total).toBe(1);
      expect(list.body.items[0].id).toBe(careLogId);
    });

    it('rejects invalid care type and cross-user plant access', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/care-logs')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ myPlantId: Number(plantId), careType: 'invalid' })
        .expect(400);

      const otherPlant = await prisma.myPlant.create({ data: { userId: user2Id, speciesId, nickname: '他人的植物' } });
      await request(app.getHttpServer())
        .post('/api/v1/care-logs')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ myPlantId: otherPlant.id, careType: 'water' })
        .expect(403);
    });

    it('prevents another user from deleting the care log', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/care-logs/${careLogId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
    });
  });

  describe('Diaries', () => {
    it('creates and lists a diary entry', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/diaries')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ myPlantId: Number(plantId), content: '今天长了两片新叶子', imageUrl: 'https://example.com/leaf.jpg' })
        .expect(201);
      expect(response.body.content).toBe('今天长了两片新叶子');
      diaryId = response.body.id;

      const list = await request(app.getHttpServer())
        .get('/api/v1/diaries')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(list.body.total).toBe(1);
      expect(list.body.items[0].id).toBe(diaryId);
    });

    it('isolates and protects diary records', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/diaries')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);
      expect(list.body.total).toBe(0);

      await request(app.getHttpServer())
        .delete(`/api/v1/diaries/${diaryId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
    });
  });

  describe('Favorites', () => {
    it('adds, filters and removes a favorite', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ speciesId, category: 'beginner' })
        .expect(201);
      expect(response.body.species.id).toBe(String(speciesId));

      const list = await request(app.getHttpServer())
        .get('/api/v1/favorites')
        .set('Authorization', `Bearer ${user1Token}`)
        .query({ category: 'beginner' })
        .expect(200);
      expect(list.body.total).toBe(1);

      await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ speciesId })
        .expect(409);

      await request(app.getHttpServer())
        .delete(`/api/v1/favorites/${speciesId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
    });

    it('requires authentication and validates species existence', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .send({ speciesId })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ speciesId: 99999 })
        .expect(404);
    });
  });

  describe('Achievements', () => {
    it('lists public definitions and starts with no unlocked achievements', async () => {
      const all = await request(app.getHttpServer()).get('/api/v1/achievements').expect(200);
      expect(all.body).toHaveLength(2);

      const mine = await request(app.getHttpServer())
        .get('/api/v1/achievements/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(mine.body).toHaveLength(0);
    });

    it('unlocks eligible achievements once and keeps users isolated', async () => {
      const checked = await request(app.getHttpServer())
        .get('/api/v1/achievements/check')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(checked.body.newlyUnlocked).toContain('第一盆植物');

      const checkedAgain = await request(app.getHttpServer())
        .get('/api/v1/achievements/check')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(checkedAgain.body.newlyUnlocked).toHaveLength(0);

      const other = await request(app.getHttpServer())
        .get('/api/v1/achievements/me')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);
      expect(other.body).toHaveLength(0);
    });
  });

  describe('Recognition', () => {
    it('returns user-scoped recognition history', async () => {
      await prisma.recognition.create({
        data: { userId: user1Id, speciesId, rawName: 'Sprint D 绿萝', confidence: 96, imageUrl: 'https://example.com/a.jpg' },
      });
      await prisma.recognition.create({
        data: { userId: user2Id, rawName: '他人的识别', confidence: 50 },
      });

      const mine = await request(app.getHttpServer())
        .get('/api/v1/recognition/history')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(mine.body.total).toBe(1);
      expect(mine.body.items[0].rawName).toBe('Sprint D 绿萝');
      expect(mine.body.items[0].species.id).toBe(String(speciesId));

      const other = await request(app.getHttpServer())
        .get('/api/v1/recognition/history')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);
      expect(other.body.total).toBe(1);
      expect(other.body.items[0].rawName).toBe('他人的识别');
    });

    it('returns cached plant details without calling Perenual', async () => {
      await prisma.plantSpecies.update({ where: { id: speciesId }, data: { perenualId: 987654 } });
      const response = await request(app.getHttpServer())
        .get('/api/v1/recognition/plant/987654')
        .expect(200);
      expect(response.body).toMatchObject({ id: String(speciesId), name: 'Sprint D 绿萝', perenualId: 987654 });
    });

    it('rejects unauthenticated identify and reports missing AI configuration', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/recognition/identify')
        .send({ imageBase64: 'dGVzdA==' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/recognition/identify')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ imageBase64: 'dGVzdA==' })
        .expect(500);

      expect(recognitionHttpClient.request).toHaveBeenCalledTimes(2);
    });
  });
});
