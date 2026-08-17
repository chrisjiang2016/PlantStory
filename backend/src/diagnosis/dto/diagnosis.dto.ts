import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CreateDiagnosisDto {
  @ApiPropertyOptional({
    description: '关联的本地病虫害知识 ID；未指定时保存为待确认诊断记录',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  pestDiseaseId?: number;

  @ApiPropertyOptional({
    description: '诊断图片 URL。文件上传能力将在图片存储接入后提供。',
    example: 'https://example.com/plant-leaf.jpg',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(512)
  imageUrl?: string;

  @ApiPropertyOptional({
    description: '用户描述的症状',
    example: '叶片出现褐色圆形斑点，近一周浇水较频繁。',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  symptomDesc?: string;
}

export class QueryDiseasesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '名称关键词', example: '叶斑' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  q?: string;

  @ApiPropertyOptional({ description: '病虫害类型，例如 disease 或 pest', example: 'disease' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  type?: string;

}

export class QueryDiagnosisHistoryDto extends PaginationQueryDto {}
