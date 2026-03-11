import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { ProfileModule } from './profile/profile.module';
import { SupabaseStrategy } from './auth/strategies/supabase.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    ProfileModule,
  ],
  controllers: [AppController],
  providers: [AppService, SupabaseStrategy],
})
export class AppModule {}
