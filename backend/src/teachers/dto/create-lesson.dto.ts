import { IsString, IsOptional, IsIn, IsNumber, Min } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['video', 'pdf'])
  @IsOptional()
  type?: 'video' | 'pdf';

  @IsNumber()
  @Min(0)
  @IsOptional()
  order_index?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  duration_minutes?: number;
}
