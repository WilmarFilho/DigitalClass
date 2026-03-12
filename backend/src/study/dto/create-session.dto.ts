import { IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsUUID()
  subject_id: string;
}
