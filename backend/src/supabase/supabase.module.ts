import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseService } from './supabase.service';
import { DatabaseLoggerService } from './database-logger.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SupabaseService, DatabaseLoggerService],
  exports: [SupabaseService, DatabaseLoggerService],
})
export class SupabaseModule {}
