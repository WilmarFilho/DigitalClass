import { IsString, IsNumber, IsOptional, IsIn, Min, Max, Matches } from 'class-validator';

export class CreateCalendarEventDto {
  @IsString()
  subject_id!: string;

  @IsString()
  scheduled_date!: string; // YYYY-MM-DD

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'scheduled_time must be HH:mm' })
  @IsOptional()
  scheduled_time?: string; // HH:mm

  @IsNumber()
  @Min(15)
  @Max(480)
  duration_minutes!: number;

  @IsString()
  @IsIn(['pending', 'completed', 'missed'])
  @IsOptional()
  status?: 'pending' | 'completed' | 'missed';
}
