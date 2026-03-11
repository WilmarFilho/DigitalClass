import { Module } from '@nestjs/common';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [SupabaseModule, ProfileModule],
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
