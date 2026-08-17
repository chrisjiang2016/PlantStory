import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DiariesService } from './diaries.service';
import { CreateDiaryDto } from './dto/diaries.dto';
import { QueryDiariesDto } from './dto/query-diaries.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Diaries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('diaries')
export class DiariesController {
  constructor(private readonly service: DiariesService) {}

  @Get()
  @ApiOperation({ summary: '获取生长日记列表' })
  @ApiQuery({ name: 'plantId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async list(@Request() req: any, @Query() query: QueryDiariesDto) {
    return this.service.list(req.user.id, query.plantId, query.page, query.pageSize);
  }

  @Post()
  @ApiOperation({ summary: '发布生长日记' })
  async create(@Request() req: any, @Body() dto: CreateDiaryDto) {
    return this.service.create(req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除日记' })
  async delete(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.delete(req.user.id, id);
  }
}
