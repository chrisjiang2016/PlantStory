import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request,
  ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import { CreateReminderDto, QueryCompletedRemindersDto, UpdateReminderDto } from './dto/reminders.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly service: RemindersService) {}

  @Get()
  @ApiOperation({ summary: '获取待办提醒列表' })
  @ApiQuery({ name: 'today', required: false, description: '只返回今天（true/false）' })
  async list(@Request() req: any, @Query('today') today?: string) {
    return this.service.list(req.user.id, today === 'true');
  }

  @Get('completed')
  @ApiOperation({ summary: '获取已完成提醒' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async getCompleted(@Request() req: any, @Query() query: QueryCompletedRemindersDto) {
    return this.service.getCompleted(req.user.id, query.page, query.pageSize);
  }

  @Post()
  @ApiOperation({ summary: '创建提醒' })
  async create(@Request() req: any, @Body() dto: CreateReminderDto) {
    return this.service.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新提醒' })
  async update(@Request() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReminderDto) {
    return this.service.update(req.user.id, id, dto);
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '标记提醒完成（重复提醒自动创建下一次）' })
  async complete(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.complete(req.user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除提醒' })
  async delete(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.delete(req.user.id, id);
  }
}
