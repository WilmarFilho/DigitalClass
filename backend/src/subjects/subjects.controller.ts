import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SubjectsService, type RecommendedSubject } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get('recommendations')
  @UseGuards(SupabaseJwtGuard)
  async getRecommendations(@Req() req: any): Promise<RecommendedSubject[]> {
    return this.subjectsService.getRecommendations(req.user.id);
  }

  @Get()
  @UseGuards(SupabaseJwtGuard)
  async getMySubjects(@Req() req: any) {
    return this.subjectsService.getMySubjects(req.user.id);
  }

  @Post()
  @UseGuards(SupabaseJwtGuard)
  async create(@Req() req: any, @Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(req.user.id, dto);
  }
}
