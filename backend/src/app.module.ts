import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { ProfileModule } from './profile/profile.module';
import { SubjectsModule } from './subjects/subjects.module';
import { CalendarModule } from './calendar/calendar.module';
import { StudyModule } from './study/study.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TeachersModule } from './teachers/teachers.module';
import { SupabaseStrategy } from './auth/strategies/supabase.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    ProfileModule,
    SubjectsModule,
    CalendarModule,
    StudyModule,
    DashboardModule,
    TeachersModule,
  ],
  controllers: [AppController],
  providers: [AppService, SupabaseStrategy],
})
export class AppModule {}
