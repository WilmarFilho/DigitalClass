import { IsString, IsOptional, IsBoolean, IsNumber, Min, IsIn } from 'class-validator';

export class CreateTeacherAreaDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  color_code?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  monthly_price?: number;

  @IsBoolean()
  @IsOptional()
  is_private?: boolean;

  @IsString()
  @IsIn(['recurring', 'one_time'])
  @IsOptional()
  payment_model?: 'recurring' | 'one_time';

  @IsString()
  @IsIn(['cover', 'contain', 'fill'])
  @IsOptional()
  banner_fit?: 'cover' | 'contain' | 'fill';

  @IsString()
  @IsIn(['center', 'top', 'bottom', 'left', 'right'])
  @IsOptional()
  banner_position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
}
