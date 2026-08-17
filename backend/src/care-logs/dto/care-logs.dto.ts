import { IsString, IsOptional, IsIn, IsDateString, MaxLength, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CARE_TYPES = ['water', 'fertilize', 'prune', 'repot', 'other'] as const;

export class CreateCareLogDto {
  @ApiProperty({ description: '关联植物 ID', example: 1 })
  @IsInt()
  @Min(1)
  myPlantId: number;

  @ApiProperty({ description: '养护类型', enum: CARE_TYPES })
  @IsIn(CARE_TYPES)
  careType: string;

  @ApiPropertyOptional({ description: '备注', example: '今天浇了一杯水' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @ApiPropertyOptional({ description: '执行时间，默认当前时间' })
  @IsOptional()
  @IsDateString()
  performedAt?: string;
}
