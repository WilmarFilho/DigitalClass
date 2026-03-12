import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

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
}
