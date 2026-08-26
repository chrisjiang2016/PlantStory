import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── 健康检查端点（在全局前缀之前注册）──
  app.getHttpAdapter().get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── 全局前缀 ──
  app.setGlobalPrefix('api/v1');

  // ── CORS（允许本地开发及已发布的 Web Demo，并支持 HttpOnly refresh cookie）──
  app.enableCors({
    origin: [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      'https://chrisjiang2016.github.io',
      /^https:\/\/plant-story-[a-z0-9-]+-jly2008s-projects\.vercel\.app$/,
    ],
    credentials: true,
  });

  // ── 全局参数校验管道 ──
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // 自动剥离未声明字段
      forbidNonWhitelisted: true, // 传了未声明字段直接报 400
      transform: true,            // 自动类型转换
    }),
  );

  // ── Swagger 文档 ──
  const config = new DocumentBuilder()
    .setTitle('植の物语 API')
    .setDescription(
      '植の物语 — 个人植物管理与识花 App 后端接口文档。\n\n' +
      '认证方式：所有需要登录的接口均需在 Header 中携带\n' +
      '`Authorization: Bearer <access_token>`',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', '认证模块')
    .addTag('Garden', '我的花园')
    .addTag('Recognition', '识花识别')
    .addTag('Reminders', '养护提醒')
    .addTag('CareLogs', '养护记录')
    .addTag('Diaries', '生长日记')
    .addTag('Favorites', '收藏')
    .addTag('Diagnosis', '病虫害诊断')
    .addTag('Encyclopedia', '植物百科')
    .addTag('Achievements', '成就系统')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🌱 植の物语 API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
