import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearTestDatabase, createTestApp } from './test-app';

const REFRESH_COOKIE_NAME = 'ps_refresh_token';

function getSetCookie(response: request.Response): string[] {
  const value = response.headers['set-cookie'];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractRefreshCookie(response: request.Response): string {
  const cookie = getSetCookie(response).find((item) => item.startsWith(`${REFRESH_COOKIE_NAME}=`));
  if (!cookie) throw new Error('refresh cookie missing');
  return cookie.split(';')[0];
}

function expectHttpOnlyRefreshCookie(response: request.Response): string {
  const cookie = getSetCookie(response).find((item) => item.startsWith(`${REFRESH_COOKIE_NAME}=`));
  expect(cookie).toEqual(expect.any(String));
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('Path=/api/v1/auth/web');
  expect(cookie).toContain('SameSite=Lax');
  return cookie!;
}

describe('Sprint F Web Auth Cookie API', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await clearTestDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('registers web user, sets HttpOnly refresh cookie, and does not expose refresh token in JSON', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/web/register')
      .send({ username: 'webcookie1', password: 'pass123456' })
      .expect(201);

    expect(response.body.user.username).toBe('webcookie1');
    expect(response.body.tokens.accessToken).toEqual(expect.any(String));
    expect(response.body.tokens.expiresIn).toBe(900);
    expect(response.body.tokens.refreshToken).toBeUndefined();
    expectHttpOnlyRefreshCookie(response);
  });

  it('logs in web user with HttpOnly refresh cookie only', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/web/login')
      .send({ username: 'webcookie1', password: 'pass123456' })
      .expect(200);

    expect(response.body.user.username).toBe('webcookie1');
    expect(response.body.tokens.accessToken).toEqual(expect.any(String));
    expect(response.body.tokens.refreshToken).toBeUndefined();
    expectHttpOnlyRefreshCookie(response);
  });

  it('refreshes web access token from cookie and rotates refresh cookie', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/web/login')
      .send({ username: 'webcookie1', password: 'pass123456' })
      .expect(200);
    const refreshCookie = extractRefreshCookie(login);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/web/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);

    expect(response.body.tokens.accessToken).toEqual(expect.any(String));
    expect(response.body.tokens.expiresIn).toBe(900);
    expect(response.body.tokens.refreshToken).toBeUndefined();
    expectHttpOnlyRefreshCookie(response);
  });

  it('rejects web refresh without cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/web/refresh')
      .expect(401);

    expect(response.body.message).toBe('refresh_token 缺失');
  });

  it('clears refresh cookie on web logout', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/web/logout')
      .expect(200);

    const cookie = expectHttpOnlyRefreshCookie(response);
    expect(cookie).toContain(`${REFRESH_COOKIE_NAME}=`);
    expect(cookie).toContain('Max-Age=0');
    expect(response.body.message).toBe('退出成功');
  });

  it('allows credentialed Flutter Web CORS preflight from localhost', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/v1/auth/web/refresh')
      .set('Origin', 'http://localhost:7357')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:7357');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});
