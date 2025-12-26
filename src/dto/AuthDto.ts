import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;
}

export class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

