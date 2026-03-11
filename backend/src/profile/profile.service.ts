import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProfileDto } from './dto/create-profile.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async createOrUpdateProfile(userId: string, data: CreateProfileDto) {
    const supabase = this.supabaseService.getClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        role: data.role,
        learning_goals: data.learning_goals || [],
        interests: data.interests || [],
        hours_per_day: data.hours_per_day || 2,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error upserting profile for user ${userId}: ${error.message}`);
      throw new Error(error.message);
    }

    return profile;
  }
}
