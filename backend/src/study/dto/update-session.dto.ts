import { IsInt, Min, IsOptional, IsBoolean } from 'class-validator';

export class UpdateSessionDto {
  @IsInt()
  @Min(0)
  duration_minutes: number;

  @IsOptional()
  @IsBoolean()
  is_finished?: boolean;
}
