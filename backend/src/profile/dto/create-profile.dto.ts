import { IsString, IsArray, IsOptional, IsNumber, IsIn } from 'class-validator';
import type { CompleteProfileDto, Role } from '@eduflow/types';

export class CreateProfileDto implements CompleteProfileDto {
  @IsString()
  @IsOptional()
  full_name?: string;

  @IsString()
  @IsOptional()
  avatar_url?: string;

  @IsString()
  @IsOptional()
  banner_url?: string;

  @IsString()
  @IsIn(['student', 'teacher'])
  role!: Role;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  learning_goals?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  interests?: string[];

  @IsNumber()
  @IsOptional()
  hours_per_day?: number;

  @IsString()
  @IsOptional()
  conta_bancaria?: string;

  @IsString()
  @IsOptional()
  chave_pix?: string;

  @IsNumber()
  @IsOptional()
  @IsIn([5, 10, 15])
  dia_repasse?: number;

  @IsString()
  @IsOptional()
  @IsIn(['pix', 'transferencia_bancaria'])
  preferencia_repasse?: 'pix' | 'transferencia_bancaria';
}
