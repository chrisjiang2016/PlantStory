import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

const WEB_REFRESH_COOKIE_NAME = 'ps_refresh_token';
const WEB_REFRESH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function buildRefreshCookie(refreshToken: string): string {
  return [
    `${WEB_REFRESH_COOKIE_NAME}=${encodeURIComponent(refreshToken)}`,
    'HttpOnly',
    'Path=/api/v1/auth/web',
    'SameSite=Lax',
    `Max-Age=${WEB_REFRESH_COOKIE_MAX_AGE_SECONDS}`,
  ].join('; ');
}

function buildClearRefreshCookie(): string {
  return [
    `${WEB_REFRESH_COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/api/v1/auth/web',
    'SameSite=Lax',
    'Max-Age=0',
  ].join('; ');
}

function readCookie(req: any, name: string): string | undefined {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader || typeof cookieHeader !== 'string') return undefined;
  const cookies = cookieHeader.split(';').map((item) => item.trim());
  const prefix = `${name}=`;
  const raw = cookies.find((item) => item.startsWith(prefix));
  return raw ? decodeURIComponent(raw.slice(prefix.length)) : undefined;
}

function withoutRefreshToken(result: any) {
  return {
    user: result.user,
    tokens: {
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
    },
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /auth/register ──
  @Post('register')
  @ApiOperation({ summary: '用户注册', description: '注册成功后自动登录并返回 token 对' })
  @ApiCreatedResponse({ description: '注册成功' })
  @ApiConflictResponse({ description: '用户名已被占用' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.username, dto.password);
  }

  // ── POST /auth/login ──
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiOkResponse({ description: '登录成功' })
  @ApiUnauthorizedResponse({ description: '用户名或密码错误' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  // ── POST /auth/web/register ──
  @Post('web/register')
  @ApiOperation({
    summary: 'Web 用户注册（refresh token 写入 HttpOnly Cookie）',
    description: '响应体只返回 access token；refresh token 不暴露给前端 JS。',
  })
  @ApiCreatedResponse({ description: '注册成功' })
  @ApiConflictResponse({ description: '用户名已被占用' })
  async webRegister(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto.username, dto.password);
    res.setHeader('Set-Cookie', buildRefreshCookie(result.tokens.refreshToken));
    return withoutRefreshToken(result);
  }

  // ── POST /auth/web/login ──
  @Post('web/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Web 用户登录（refresh token 写入 HttpOnly Cookie）',
    description: '响应体只返回 access token；refresh token 不暴露给前端 JS。',
  })
  @ApiOkResponse({ description: '登录成功' })
  @ApiUnauthorizedResponse({ description: '用户名或密码错误' })
  async webLogin(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto.username, dto.password);
    res.setHeader('Set-Cookie', buildRefreshCookie(result.tokens.refreshToken));
    return withoutRefreshToken(result);
  }

  // ── POST /auth/refresh ──
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '刷新 access_token',
    description: '使用 refresh_token 换取新 token 对，旧 refresh_token 立即失效（Rotate）',
  })
  @ApiOkResponse({ description: '刷新成功' })
  @ApiUnauthorizedResponse({ description: 'refresh_token 已失效' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  // ── POST /auth/web/refresh ──
  @Post('web/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Web 刷新 access token（从 HttpOnly Cookie 读取 refresh token）',
  })
  @ApiOkResponse({ description: '刷新成功' })
  @ApiUnauthorizedResponse({ description: 'refresh token 缺失或已失效' })
  async webRefresh(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = readCookie(req, WEB_REFRESH_COOKIE_NAME);
    if (!refreshToken) {
      throw new UnauthorizedException({ code: 401, message: 'refresh_token 缺失' });
    }

    const tokens = await this.authService.refresh(refreshToken);
    res.setHeader('Set-Cookie', buildRefreshCookie(tokens.refreshToken));
    return {
      tokens: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    };
  }

  // ── POST /auth/web/logout ──
  @Post('web/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Web 退出登录（清除 HttpOnly refresh cookie）' })
  @ApiOkResponse({ description: '退出成功' })
  async webLogout(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Set-Cookie', buildClearRefreshCookie());
    return { message: '退出成功' };
  }

  // ── GET /auth/profile ──
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiOkResponse({ description: '获取成功' })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  // ── PATCH /auth/profile ──
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新当前用户信息', description: '只传需要修改的字段' })
  @ApiOkResponse({ description: '更新成功' })
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  // ── POST /auth/change-password ──
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '修改密码', description: '需要提供旧密码验证' })
  @ApiOkResponse({ description: '密码修改成功' })
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(
      req.user.id,
      dto.oldPassword,
      dto.newPassword,
    );
  }
}
