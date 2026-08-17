import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { GardenService } from './garden.service';
import { AddPlantDto, UpdatePlantDto } from './dto/garden.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Garden')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garden')
export class GardenController {
  constructor(private readonly gardenService: GardenService) {}

  // ── GET /garden/plants ──
  @Get('plants')
  @ApiOperation({ summary: '获取我的花园植物列表' })
  @ApiOkResponse({ description: '返回用户花园所有植物' })
  async listPlants(@Request() req: any) {
    return this.gardenService.listPlants(req.user.id);
  }

  // ── GET /garden/plants/:id ──
  @Get('plants/:id')
  @ApiOperation({ summary: '获取单个植物详情（含养护记录、日记、提醒）' })
  @ApiOkResponse({ description: '返回植物详情' })
  @ApiNotFoundResponse({ description: '植物不存在' })
  async getPlant(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.gardenService.getPlant(req.user.id, id);
  }

  // ── POST /garden/plants ──
  @Post('plants')
  @ApiOperation({ summary: '添加植物到花园' })
  @ApiCreatedResponse({ description: '添加成功' })
  @ApiNotFoundResponse({ description: '植物种类不存在' })
  async addPlant(@Request() req: any, @Body() dto: AddPlantDto) {
    return this.gardenService.addPlant(req.user.id, dto);
  }

  // ── PATCH /garden/plants/:id ──
  @Patch('plants/:id')
  @ApiOperation({ summary: '更新植物信息（昵称/位置/阶段/照片）' })
  @ApiOkResponse({ description: '更新成功' })
  async updatePlant(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlantDto,
  ) {
    return this.gardenService.updatePlant(req.user.id, id, dto);
  }

  // ── DELETE /garden/plants/:id ──
  @Delete('plants/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除花园中的植物（级联删除关联数据）' })
  @ApiOkResponse({ description: '删除成功' })
  async removePlant(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.gardenService.removePlant(req.user.id, id);
  }
}
