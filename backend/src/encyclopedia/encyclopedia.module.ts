import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EncyclopediaController } from './encyclopedia.controller';
import { EncyclopediaService } from './encyclopedia.service';

@Module({
  imports: [PrismaModule],
  controllers: [EncyclopediaController],
  providers: [EncyclopediaService],
})
export class EncyclopediaModule {}
