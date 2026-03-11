import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';

@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @UseGuards(SupabaseJwtGuard)
  async getMyProfile(@Req() req: any) {
    return this.profileService.getProfile(req.user.id);
  }

  @Post()
  @UseGuards(SupabaseJwtGuard)
  async createProfile(@Req() req: any, @Body() createProfileDto: CreateProfileDto) {
    return this.profileService.createOrUpdateProfile(req.user.id, createProfileDto);
  }
}
