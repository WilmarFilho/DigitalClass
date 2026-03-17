import { IsUUID, IsOptional } from 'class-validator';

export class CreateSessionDto {
  @IsUUID()
  subject_id: string;

  @IsUUID()
  @IsOptional()
  calendar_event_id?: string;
}
