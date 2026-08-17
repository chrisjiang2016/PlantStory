import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearTestDatabase, createTestApp } from './test-app';

describe('Sprint A core API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let plantId: string;
  let speciesId: number;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    await clearTestDatabase(prisma);

    const species = await prisma.plantSpecies.create({
      data: { name: '测试绿萝', scientificName: 'Epipremnum aureum' },
    });
    speciesId = species.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('registers a user and returns access token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ username: 'sprintatest', password: 'pass123456' })
      .expect(201);

    expect(response.body.user.id).toEqual(expect.any(String));
    expect(response.body.tokens.accessToken).toEqual(expect.any(String));
    accessToken = response.body.tokens.accessToken;
  });

  it('rejects duplicate registration', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ username: 'sprintatest', password: 'pass123456' })
      .expect(409);
  });

  it('logs in and returns a usable access token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'sprintatest', password: 'pass123456' })
      .expect(200);

    expect(response.body.user.username).toBe('sprintatest');
    expect(response.body.tokens.accessToken).toEqual(expect.any(String));
    accessToken = response.body.tokens.accessToken;
  });

  it('gets the authenticated profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({ username: 'sprintatest' });
  });

  it('creates a plant in the garden', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/garden/plants')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ speciesId, nickname: '测试小绿', location: '阳台' })
      .expect(201);

    expect(response.body).toMatchObject({ nickname: '测试小绿', location: '阳台' });
    plantId = response.body.id;
  });

  it('lists the authenticated user garden', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/garden/plants')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(plantId);
  });
});
