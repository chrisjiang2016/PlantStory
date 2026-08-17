import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { RecognitionService } from './recognition.service';
import { IdentifyPlantDto } from './dto/recognition.dto';
import { QueryRecognitionHistoryDto, SearchPlantQueryDto } from './dto/query-recognition.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Recognition')
@Controller('recognition')
export class RecognitionController {
  constructor(private readonly recognitionService: RecognitionService) {}

  // ── POST /recognition/identify（需要登录）────────────────
  @Post('identify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '识别植物',
    description: '上传植物图片，返回百度识花结果 + Perenual 植物详情',
  })
  @ApiOkResponse({ description: '识别成功' })
  async identify(@Request() req: any, @Body() dto: IdentifyPlantDto) {
    return this.recognitionService.identify(req.user.id, dto.imageBase64);
  }

  // ── GET /recognition/history（需要登录）──────────────────
  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取识别历史记录' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认 1' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数，默认 20' })
  async getHistory(
    @Request() req: any,
    @Query() query: QueryRecognitionHistoryDto,
  ) {
    return this.recognitionService.getHistory(
      req.user.id,
      query.page,
      query.pageSize,
    );
  }

  // ── GET /recognition/search（公开接口，搜索百科）─────────
  @Get('search')
  @ApiOperation({
    summary: '搜索植物百科',
    description: '从 Perenual 搜索植物，支持按名称/学名模糊匹配',
  })
  @ApiQuery({ name: 'q', description: '搜索关键词', example: '绿萝' })
  @ApiQuery({ name: 'page', required: false })
  async search(@Query() query: SearchPlantQueryDto) {
    return this.recognitionService.searchPlant(query.q, query.page, query.pageSize);
  }

  // ── GET /recognition/plant/:perenualId（公开接口）────────
  @Get('plant/:perenualId')
  @ApiOperation({
    summary: '获取植物详情（Perenual）',
    description: '按 Perenual ID 获取植物详细信息，本地有缓存则直接返回',
  })
  @ApiOkResponse({ description: '植物详情' })
  @ApiNotFoundResponse({ description: '植物不存在' })
  async getPlantDetail(
    @Param('perenualId', ParseIntPipe) perenualId: number,
  ) {
    return this.recognitionService.getPlantDetail(perenualId);
  }
}
