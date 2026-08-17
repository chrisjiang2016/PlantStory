import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryRecognitionHistoryDto extends PaginationQueryDto {}

export class SearchPlantQueryDto extends PaginationQueryDto {
  @ApiProperty({ description: '搜索关键词', example: '绿萝' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  q: string;

  @ApiPropertyOptional({ description: '每页条数暂预留，当前 Perenual 搜索只返回上游分页结果', example: 20 })
  pageSize?: number;
}
