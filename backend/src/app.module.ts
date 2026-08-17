import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GardenModule } from './garden/garden.module';
import { RecognitionModule } from './recognition/recognition.module';
import { RemindersModule } from './reminders/reminders.module';
import { CareLogsModule } from './care-logs/care-logs.module';
import { DiariesModule } from './diaries/diaries.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AchievementsModule } from './achievements/achievements.module';
import { DiagnosisModule } from './diagnosis/diagnosis.module';
import { EncyclopediaModule } from './encyclopedia/encyclopedia.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    AuthModule,
    GardenModule,
    RecognitionModule,
    RemindersModule,
    CareLogsModule,
    DiariesModule,
    FavoritesModule,
    AchievementsModule,
    DiagnosisModule,
    EncyclopediaModule,
  ],
})
export class AppModule {}
