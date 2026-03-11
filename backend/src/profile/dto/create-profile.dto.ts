import { IsString, IsArray, IsOptional, IsNumber, IsIn } from 'class-validator';
import type { CompleteProfileDto, Role } from '@eduflow/types';

export class CreateProfileDto implements CompleteProfileDto {
  @IsString()
  @IsOptional()
  full_name?: string;

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
}
