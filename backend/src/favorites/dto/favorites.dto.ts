import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsInt, Min } from 'class-validator';

export class AddFavoriteDto {
  @ApiProperty({ description: '植物种类 ID（plant_species 表）' })
  @IsInt()
  @Min(1)
  speciesId: number;

  @ApiPropertyOptional({ description: '分类标签：beginner / shade_desktop / leaf' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  category?: string;
}
