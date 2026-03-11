import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [SupabaseModule, ProfileModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
