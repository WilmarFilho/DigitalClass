import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString, Min, Max } from 'class-validator';

export class UpdateSubjectDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  color_code?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  target_hours?: number;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  difficulty_level?: number;

  @IsBoolean()
  @IsOptional()
  is_custom?: boolean;
}
