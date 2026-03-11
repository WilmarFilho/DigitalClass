import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProfileDto } from './dto/create-profile.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async getProfile(userId: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, full_name, learning_goals, interests, hours_per_day')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error fetching profile for user ${userId}: ${error.message}`);
      return null;
    }
    return data;
  }

  async createOrUpdateProfile(userId: string, data: CreateProfileDto) {
    const supabase = this.supabaseService.getClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: data.full_name ?? null,
        role: data.role,
        learning_goals: data.learning_goals || [],
        interests: data.interests || [],
        hours_per_day: data.hours_per_day ?? 2,
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
