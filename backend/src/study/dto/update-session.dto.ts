import { IsInt, Min } from 'class-validator';

export class UpdateSessionDto {
  @IsInt()
  @Min(0)
  duration_minutes: number;
}
