import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryEncyclopediaDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '名称或学名关键词', example: '绿萝' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  q?: string;

  @ApiPropertyOptional({ description: '科（family）', example: 'Araceae' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  family?: string;

  @ApiPropertyOptional({ description: '属（genus）', example: 'Epipremnum' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  genus?: string;

  @ApiPropertyOptional({ description: '浇水频率', example: 'Average' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  watering?: string;

  @ApiPropertyOptional({ description: '光照需求', example: 'Full sun' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sunlight?: string;

}
