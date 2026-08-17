import { Controller, Get, Post, Delete, Param, Query, UseGuards, Request, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { AddFavoriteDto } from './dto/favorites.dto';
import { QueryFavoritesDto } from './dto/query-favorites.dto';
import { Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: '获取收藏列表' })
  @ApiQuery({ name: 'category', required: false, description: '按标签筛选' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async list(@Request() req: any, @Query() query: QueryFavoritesDto) {
    return this.service.list(req.user.id, query.category, query.page, query.pageSize);
  }

  @Post()
  @ApiOperation({ summary: '添加收藏' })
  async add(@Request() req: any, @Body() dto: AddFavoriteDto) {
    return this.service.add(req.user.id, dto);
  }

  @Delete(':speciesId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '取消收藏' })
  async remove(@Request() req: any, @Param('speciesId', ParseIntPipe) speciesId: number) {
    return this.service.remove(req.user.id, speciesId);
  }
}
