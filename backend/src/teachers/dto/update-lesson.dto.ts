import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateLessonDto {
  @IsString()
  @IsOptional()
  description?: string | null;

  @IsNumber()
  @Min(0)
  @IsOptional()
  duration_minutes?: number | null;

  @IsDateString()
  @IsOptional()
  scheduled_at?: string | null;
}
