import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AchievementsService } from './achievements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Achievements')
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly service: AchievementsService) {}

  @Get()
  @ApiOperation({ summary: '获取所有成就定义（公开）' })
  async getAll() {
    return this.service.getAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户已解锁成就' })
  async getMy(@Request() req: any) {
    return this.service.getUserAchievements(req.user.id);
  }

  @Get('check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '检查并解锁新成就' })
  async check(@Request() req: any) {
    return this.service.checkAndUnlock(req.user.id);
  }
}
