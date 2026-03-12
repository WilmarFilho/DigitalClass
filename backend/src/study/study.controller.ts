import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { StudyService, SessionWithSubject } from './study.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { ChatMessageDto } from './dto/chat-message.dto';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';

@Controller('study')
@UseGuards(SupabaseJwtGuard)
export class StudyController {
  constructor(private readonly studyService: StudyService) {}

  @Post('sessions')
  async createSession(@Req() req: any, @Body() dto: CreateSessionDto): Promise<SessionWithSubject> {
    return this.studyService.createSession(req.user.id, dto.subject_id);
  }

  @Get('sessions')
  async getRecentSessions(
    @Req() req: any,
    @Query('limit') limit?: string,
  ): Promise<SessionWithSubject[]> {
    const limitNum = limit ? Math.min(parseInt(limit, 10) || 10, 50) : 10;
    return this.studyService.getRecentSessions(req.user.id, limitNum);
  }

  @Get('sessions/:id')
  async getSession(@Req() req: any, @Param('id') id: string): Promise<SessionWithSubject> {
    return this.studyService.getSession(req.user.id, id);
  }

  @Get('sessions/:id/detail')
  async getSessionDetail(@Req() req: any, @Param('id') id: string) {
    return this.studyService.getSessionDetail(req.user.id, id);
  }

  @Get('sessions/:id/assets')
  async getSessionAssets(@Req() req: any, @Param('id') id: string) {
    return this.studyService.getSessionAssets(req.user.id, id);
  }

  @Patch('sessions/:id')
  async updateSession(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.studyService.updateSessionDuration(req.user.id, id, dto.duration_minutes);
  }

  @Get('sessions/:id/chat/intro')
  async getChatIntro(@Req() req: any, @Param('id') id: string) {
    const message = await this.studyService.getChatIntro(id, req.user.id);
    return { message };
  }

  @Get('sessions/:id/chat/messages')
  async getChatMessages(@Req() req: any, @Param('id') id: string) {
    return this.studyService.getChatMessages(id, req.user.id);
  }

  @Post('sessions/:id/chat')
  async chat(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ChatMessageDto,
  ) {
    const text = await this.studyService.chat(id, req.user.id, dto.message, dto.history ?? []);
    return { message: text };
  }

  @Post('sessions/:id/quiz/generate')
  async generateQuiz(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body?: { count?: number },
  ) {
    const count = body?.count ?? 5;
    return this.studyService.generateQuiz(id, req.user.id, count);
  }

  @Post('sessions/:id/flashcards/generate')
  async generateFlashcards(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body?: { count?: number },
  ) {
    const count = body?.count ?? 5;
    return this.studyService.generateFlashcards(id, req.user.id, count);
  }
}
