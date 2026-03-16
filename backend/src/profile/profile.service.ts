import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProfileDto } from './dto/create-profile.dto';

const AVATARS_BUCKET = 'avatars';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async getProfile(userId: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, full_name, avatar_url, banner_url, learning_goals, interests, hours_per_day, conta_bancaria, chave_pix, dia_repasse, preferencia_repasse')
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
        conta_bancaria: data.conta_bancaria ?? null,
        chave_pix: data.chave_pix ?? null,
        dia_repasse: data.dia_repasse ?? null,
        preferencia_repasse: data.preferencia_repasse ?? null,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error upserting profile for user ${userId}: ${error.message}`);
      throw new Error(error.message);
    }

    return profile;
  }

  async patchProfile(userId: string, fields: Record<string, any>) {
    const supabase = this.supabaseService.getClient();

    // Only allow certain fields to be patched
    const allowedFields = ['hours_per_day', 'full_name', 'avatar_url', 'banner_url', 'learning_goals', 'interests'];
    const patch: Record<string, any> = {};
    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        patch[key] = fields[key];
      }
    }

    if (Object.keys(patch).length === 0) {
      return this.getProfile(userId);
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error patching profile for user ${userId}: ${error.message}`);
      throw new Error(error.message);
    }
    return data;
  }

  async uploadProfileImage(
    userId: string,
    type: 'avatar' | 'banner',
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
  ) {
    const supabase = this.supabaseService.getClient();
    const ext = originalName.split('.').pop() ?? 'jpg';
    const path = `${userId}/${type}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(AVATARS_BUCKET)
      .upload(path, fileBuffer, { contentType: mimeType, upsert: true });

    if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`);

    const { data: urlData } = supabase
      .storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(uploadData.path);

    const publicUrl = urlData.publicUrl;

    // Update profile with new URL
    const field = type === 'avatar' ? 'avatar_url' : 'banner_url';
    const { data, error } = await supabase
      .from('profiles')
      .update({ [field]: publicUrl })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating ${field}: ${error.message}`);
      throw new Error(error.message);
    }

    return data;
  }
}
