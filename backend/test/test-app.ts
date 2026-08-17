import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface ProviderOverride {
  token: any;
  value: any;
}

export async function createTestApp(
  overrides: ProviderOverride[] = [],
): Promise<INestApplication> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  for (const override of overrides) {
    builder.overrideProvider(override.token).useValue(override.value);
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();

  return app;
}

/**
 * Removes test records from dependent tables before their parents so every
 * suite can safely reuse its dedicated database or the full-suite database.
 */
export async function clearTestDatabase(prisma: PrismaService): Promise<void> {
  await prisma.userAchievement.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.careLog.deleteMany();
  await prisma.diary.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.recognition.deleteMany();
  await prisma.myPlant.deleteMany();
  await prisma.user.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.pestDisease.deleteMany();
  await prisma.plantSpecies.deleteMany();
}
