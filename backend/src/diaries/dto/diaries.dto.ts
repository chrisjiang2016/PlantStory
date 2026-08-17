import { IsString, IsOptional, MaxLength, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDiaryDto {
  @ApiProperty({ description: '关联植物 ID' })
  @IsInt()
  @Min(1)
  myPlantId: number;

  @ApiPropertyOptional({ description: '日记内容', example: '今天长了两片新叶子' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  content?: string;

  @ApiPropertyOptional({ description: '图片 URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
