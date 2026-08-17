import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── 生长阶段枚举 ───────────────────────────────────────────
export const GROWTH_STAGES = ['seed', 'sprout', 'seedling', 'growing', 'mature'] as const;

export type GrowthStage = (typeof GROWTH_STAGES)[number];

export const GROWTH_STAGE_LABELS: Record<GrowthStage, string> = {
  seed: '种子期',
  sprout: '发芽期',
  seedling: '幼苗期',
  growing: '生长期',
  mature: '成熟期',
};

// ── 添加植物到花园 ─────────────────────────────────────────
export class AddPlantDto {
  @ApiProperty({ description: '植物种类 ID（plant_species 表）', example: 1 })
  @IsInt()
  @Min(1)
  speciesId: number;

  @ApiPropertyOptional({ description: '给植物起的昵称', example: '小绿' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string;

  @ApiPropertyOptional({ description: '摆放位置', example: '阳台' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  location?: string;

  @ApiPropertyOptional({
    description: '当前生长阶段',
    enum: GROWTH_STAGES,
    default: 'seed',
  })
  @IsOptional()
  @IsIn(GROWTH_STAGES)
  currentStage?: GrowthStage;

  @ApiPropertyOptional({
    description: '种植日期（ISO 格式），不传默认今天',
    example: '2026-07-01',
  })
  @IsOptional()
  @IsDateString()
  plantedAt?: string;

  @ApiPropertyOptional({ description: '植物照片 URL' })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

// ── 更新植物信息 ───────────────────────────────────────────
export class UpdatePlantDto {
  @ApiPropertyOptional({ description: '新昵称' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string;

  @ApiPropertyOptional({ description: '新位置' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  location?: string;

  @ApiPropertyOptional({ description: '新生长阶段', enum: GROWTH_STAGES })
  @IsOptional()
  @IsIn(GROWTH_STAGES)
  currentStage?: GrowthStage;

  @ApiPropertyOptional({ description: '新照片 URL' })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}
