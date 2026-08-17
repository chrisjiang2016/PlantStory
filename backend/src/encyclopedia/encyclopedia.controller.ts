import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EncyclopediaService } from './encyclopedia.service';
import { QueryEncyclopediaDto } from './dto/encyclopedia.dto';

@ApiTags('Encyclopedia')
@Controller('encyclopedia')
export class EncyclopediaController {
  constructor(private readonly service: EncyclopediaService) {}

  @Get()
  @ApiOperation({ summary: '查询植物百科列表' })
  @ApiQuery({ name: 'q', required: false, description: '名称或学名关键词' })
  @ApiQuery({ name: 'family', required: false, description: '科（family）' })
  @ApiQuery({ name: 'genus', required: false, description: '属（genus）' })
  @ApiQuery({ name: 'watering', required: false, description: '浇水频率' })
  @ApiQuery({ name: 'sunlight', required: false, description: '光照需求' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数' })
  async list(@Query() query: QueryEncyclopediaDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取植物百科详情' })
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }
}
