import { IsString, IsOptional, IsIn, IsNumber, Min, IsDateString } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  module_id?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['video', 'pdf', 'live'])
  @IsOptional()
  type?: 'video' | 'pdf' | 'live';

  @IsNumber()
  @Min(0)
  @IsOptional()
  order_index?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  duration_minutes?: number;

  @IsDateString()
  @IsOptional()
  scheduled_at?: string;
}
