import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DiagnosisService } from './diagnosis.service';
import {
  CreateDiagnosisDto,
  QueryDiagnosisHistoryDto,
  QueryDiseasesDto,
} from './dto/diagnosis.dto';

@ApiTags('Diagnosis')
@Controller('diagnosis')
export class DiagnosisController {
  constructor(private readonly service: DiagnosisService) {}

  @Get('diseases')
  @ApiOperation({ summary: '查询病虫害知识库' })
  @ApiQuery({ name: 'q', required: false, description: '名称关键词' })
  @ApiQuery({ name: 'type', required: false, description: '病虫害类型' })
  async listDiseases(@Query() query: QueryDiseasesDto) {
    return this.service.listDiseases(query);
  }

  @Get('diseases/:id')
  @ApiOperation({ summary: '获取病虫害知识详情' })
  async getDisease(@Param('id', ParseIntPipe) id: number) {
    return this.service.getDiseaseById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '保存诊断记录' })
  async create(@Request() req: any, @Body() dto: CreateDiagnosisDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户的诊断历史' })
  async getHistory(
    @Request() req: any,
    @Query() query: QueryDiagnosisHistoryDto,
  ) {
    return this.service.getHistory(req.user.id, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取诊断记录详情' })
  async getById(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.getById(req.user.id, id);
  }
}
