import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';

@Controller('profiles')
@UseGuards(SupabaseAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post()
  async createProfile(@Req() req: any, @Body() createProfileDto: CreateProfileDto) {
    return this.profileService.createOrUpdateProfile(req.user.id, createProfileDto);
  }
}
