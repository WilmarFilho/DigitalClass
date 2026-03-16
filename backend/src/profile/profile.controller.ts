import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Patch('me')
  @UseGuards(SupabaseJwtGuard)
  async patchMyProfile(@Req() req: any, @Body() body: Record<string, any>) {
    return this.profileService.patchProfile(req.user.id, body);
  }

  @Post('me/avatar')
  @UseGuards(SupabaseJwtGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileService.uploadProfileImage(
      req.user.id,
      'avatar',
      file.buffer,
      file.mimetype,
      file.originalname,
    );
  }

  @Post('me/banner')
  @UseGuards(SupabaseJwtGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadBanner(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileService.uploadProfileImage(
      req.user.id,
      'banner',
      file.buffer,
      file.mimetype,
      file.originalname,
    );
  }
}
