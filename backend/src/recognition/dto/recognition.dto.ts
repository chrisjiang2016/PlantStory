import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class IdentifyPlantDto {
  @ApiProperty({
    description: 'Base64 编码的图片（不含 data:image 前缀，直接传原始 base64）',
    example: '/9j/4AAQSkZJRgABAQEASABIAAD...',
  })
  @IsString()
  @IsNotEmpty()
  imageBase64: string;
}

export class SearchPlantDto {
  @ApiProperty({ description: '搜索关键词（植物名称）', example: '绿萝' })
  @IsString()
  @IsNotEmpty()
  query: string;
}
