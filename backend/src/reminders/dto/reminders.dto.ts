import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const CARE_TYPES = ['water', 'fertilize', 'prune', 'repot', 'other'] as const;
export const REPEAT_RULES = ['none', 'daily', 'weekly', 'biweekly', 'monthly'] as const;

export const CARE_TYPE_LABELS: Record<string, string> = {
  water: '浇水',
  fertilize: '施肥',
  prune: '修剪',
  repot: '换盆',
  other: '其他',
};

export const REPEAT_RULE_LABELS: Record<string, string> = {
  none: '不重复',
  daily: '每天',
  weekly: '每周',
  biweekly: '每两周',
  monthly: '每月',
};

export class CreateReminderDto {
  @ApiProperty({ description: '提醒标题', example: '给小绿浇水' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: '提醒时间（ISO 8601 格式）', example: '2026-07-03T09:00:00+08:00' })
  @IsDateString()
  remindAt: string;

  @ApiPropertyOptional({ description: '关联植物 ID', example: 1 })
  @IsOptional()
  myPlantId?: number;

  @ApiPropertyOptional({ description: '养护类型', enum: CARE_TYPES })
  @IsOptional()
  @IsIn(CARE_TYPES)
  careType?: string;

  @ApiPropertyOptional({ description: '重复规则', enum: REPEAT_RULES, default: 'none' })
  @IsOptional()
  @IsIn(REPEAT_RULES)
  repeatRule?: string;
}

export class QueryCompletedRemindersDto extends PaginationQueryDto {}

export class UpdateReminderDto {
  @ApiPropertyOptional({ description: '提醒标题' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: '新提醒时间' })
  @IsOptional()
  @IsDateString()
  remindAt?: string;

  @ApiPropertyOptional({ description: '新重复规则', enum: REPEAT_RULES })
  @IsOptional()
  @IsIn(REPEAT_RULES)
  repeatRule?: string;
}
