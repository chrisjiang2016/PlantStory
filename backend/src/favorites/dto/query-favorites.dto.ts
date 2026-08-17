import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryFavoritesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按标签筛选', example: 'beginner' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  category?: string;
}
