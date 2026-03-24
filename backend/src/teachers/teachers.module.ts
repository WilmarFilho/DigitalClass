import { Module } from '@nestjs/common';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import { AiService } from './ai.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { StripeModule } from '../stripe/stripe.module';
import { AwsModule } from '../aws/aws.module';

@Module({
  imports: [SupabaseModule, StripeModule, AwsModule],
  controllers: [TeachersController],
  providers: [TeachersService, AiService],
})
export class TeachersModule { }
