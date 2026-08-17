import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

/** refresh_token 有效期（秒）—— 7 天 */
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ── 注册 ────────────────────────────────────────────────
  async register(username: string, password: string) {
    const exists = await this.prisma.user.findUnique({ where: { username } });
    if (exists) {
      throw new ConflictException({ code: 409, message: '用户名已被占用' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { username, passwordHash, nickname: username },
    });

    const tokens = await this.generateTokenPair(user.id, user.username);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // ── 登录 ────────────────────────────────────────────────
  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new UnauthorizedException({ code: 401, message: '用户名或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException({ code: 401, message: '用户名或密码错误' });
    }

    const tokens = await this.generateTokenPair(user.id, user.username);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // ── 刷新 Token ──────────────────────────────────────────
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
      });

      // 校验：type 必须为 refresh
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException({ code: 401, message: 'refresh_token 无效' });
      }

      // 校验用户存在
      const user = await this.prisma.user.findUnique({ where: { id: Number(payload.sub) } });
      if (!user) {
        throw new UnauthorizedException({ code: 401, message: '用户不存在' });
      }

      // 生成新 token 对（rotate）
      return this.generateTokenPair(user.id, user.username);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException({
        code: 401,
        message: 'refresh_token 已失效，请重新登录',
      });
    }
  }

  // ── 获取个人信息 ────────────────────────────────────────
  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ code: 404, message: '用户不存在' });
    }
    return this.sanitizeUser(user);
  }

  // ── 更新个人信息 ────────────────────────────────────────
  async updateProfile(userId: number, data: { nickname?: string; avatarUrl?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.sanitizeUser(user);
  }

  // ── 修改密码 ────────────────────────────────────────────
  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ code: 404, message: '用户不存在' });
    }

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException({ code: 422, message: '旧密码错误' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: '密码修改成功' };
  }

  // ── 内部方法 ────────────────────────────────────────────

  private async generateTokenPair(userId: number, username: string): Promise<TokenPair> {
    const sub = userId.toString();

    const accessToken = this.jwt.sign(
      { sub, username, type: 'access' },
      { expiresIn: '15m' },
    );

    const refreshToken = this.jwt.sign(
      { sub, username, type: 'refresh' },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
        expiresIn: '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 分钟
    };
  }

  private sanitizeUser(user: any) {
    return {
      id: user.id.toString(),
      username: user.username,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };
  }
}


