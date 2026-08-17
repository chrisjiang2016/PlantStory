import {
  Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request,
  ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CareLogsService } from './care-logs.service';
import { CreateCareLogDto } from './dto/care-logs.dto';
import { QueryCareLogsDto } from './dto/query-care-logs.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('CareLogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('care-logs')
export class CareLogsController {
  constructor(private readonly service: CareLogsService) {}

  @Get()
  @ApiOperation({ summary: '获取养护记录列表' })
  @ApiQuery({ name: 'plantId', required: false, description: '按植物 ID 筛选' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async list(@Request() req: any, @Query() query: QueryCareLogsDto) {
    return this.service.list(req.user.id, query.plantId, query.page, query.pageSize);
  }

  @Post()
  @ApiOperation({ summary: '记录一次养护操作' })
  async create(@Request() req: any, @Body() dto: CreateCareLogDto) {
    return this.service.create(req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除养护记录' })
  async delete(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.delete(req.user.id, id);
  }
}
