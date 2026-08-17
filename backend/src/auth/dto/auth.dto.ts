import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: '用户名，英文+数字，3-32 位',
    example: 'chrisj0702',
    minLength: 3,
    maxLength: 32,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9]+$/, { message: '用户名只允许英文和数字' })
  username: string;

  @ApiProperty({
    description: '密码，英文+数字，6-32 位',
    example: 'pass123456',
    minLength: 6,
    maxLength: 32,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9]+$/, { message: '密码只允许英文和数字' })
  password: string;
}

export class LoginDto {
  @ApiProperty({ description: '用户名', example: 'chrisj0702' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '密码', example: 'pass123456' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: '登录时返回的 refresh_token',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class UpdateProfileDto {
  @ApiProperty({ description: '新昵称', required: false })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  nickname?: string;

  @ApiProperty({ description: '新头像 URL', required: false })
  @IsString()
  avatarUrl?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({
    description: '新密码，6-32 位',
    example: 'newpass123',
    minLength: 6,
    maxLength: 32,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9]+$/, { message: '密码只允许英文和数字' })
  newPassword: string;
}
