import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TeachersService } from './teachers.service';
import { CreateTeacherAreaDto } from './dto/create-teacher-area.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

@Controller('teachers')
@UseGuards(SupabaseJwtGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) { }

  // ── Aluno: navegar áreas ──────────────────────────────────────────────────

  @Get('areas')
  listAllAreas() {
    return this.teachersService.listAllAreas();
  }

  @Post('areas')
  createArea(@Req() req: any, @Body() dto: CreateTeacherAreaDto) {
    return this.teachersService.upsertMyArea(req.user.id, dto);
  }

  @Post(':areaId/ai-chat')
  async handleStudentChat(
    @Req() req: any,
    @Param('areaId') areaId: string,
    @Body() body: { question: string; history: any[] }
  ) {
    return this.teachersService.handleAiChat(
      req.user.id,
      areaId,
      body.question,
      body.history
    );
  }

  @Get('areas/:areaId')
  getAreaById(@Param('areaId') areaId: string) {
    return this.teachersService.getAreaById(areaId);
  }

  @Get('following')
  listFollowing(@Req() req: any) {
    return this.teachersService.listFollowing(req.user.id);
  }

  @Get('areas/:areaId/lessons')
  getAreaLessons(@Req() req: any, @Param('areaId') areaId: string) {
    return this.teachersService.getAreaLessons(areaId, req.user.id);
  }

  @Get('areas/:areaId/sections')
  getStudentAreaSections(@Req() req: any, @Param('areaId') areaId: string) {
    return this.teachersService.getAreaSections(req.user.id, areaId);
  }

  @Get('modules/:moduleId')
  getModuleWithLessons(@Req() req: any, @Param('moduleId') moduleId: string) {
    return this.teachersService.getModuleWithLessons(req.user.id, moduleId);
  }

  @Get('areas/:areaId/notices')
  getStudentAreaNotices(@Req() req: any, @Param('areaId') areaId: string) {
    return this.teachersService.getAreaNotices(req.user.id, areaId);
  }

  @Post('areas/:areaId/subscribe')
  subscribe(@Req() req: any, @Param('areaId') areaId: string) {
    return this.teachersService.subscribe(req.user.id, areaId);
  }

  @Delete('areas/:areaId/subscribe')
  unsubscribe(@Req() req: any, @Param('areaId') areaId: string) {
    return this.teachersService.unsubscribe(req.user.id, areaId);
  }

  // ── Stripe Checkout (Aluno: assinar área paga) ─────────────────────────────

  @Post('areas/:areaId/checkout')
  createCheckoutSession(@Req() req: any, @Param('areaId') areaId: string) {
    return this.teachersService.createCheckoutSession(req.user.id, req.user.email, areaId);
  }

  // ── Professor: minha área ─────────────────────────────────────────────────

  @Get('my-areas')
  getMyAreas(@Req() req: any) {
    return this.teachersService.getMyAreas(req.user.id);
  }

  @Get('my-areas/:areaId')
  getMyAreaById(@Req() req: any, @Param('areaId') areaId: string) {
    return this.teachersService.getMyAreaById(req.user.id, areaId);
  }

  @Post('my-areas')
  createMyArea(@Req() req: any, @Body() dto: CreateTeacherAreaDto) {
    return this.teachersService.upsertMyArea(req.user.id, dto);
  }

  @Post('my-areas/:areaId')
  updateMyArea(@Req() req: any, @Param('areaId') areaId: string, @Body() dto: CreateTeacherAreaDto) {
    return this.teachersService.upsertMyArea(req.user.id, dto, areaId);
  }

  // ── Simulação de taxas ─────────────────────────────────────────────────────

  @Get('fees')
  calculateFees(@Query('price') price: string) {
    const numericPrice = Number(price) || 0;
    return this.teachersService.calculateFees(numericPrice);
  }

  // ── Professor: aulas ──────────────────────────────────────────────────────

  @Get('my-areas/:areaId/lessons')
  getMyLessons(@Req() req: any, @Param('areaId') areaId: string) {
    return this.teachersService.getMyLessons(req.user.id, areaId);
  }

  @Post('my-areas/:areaId/lessons')
  createLesson(@Req() req: any, @Param('areaId') areaId: string, @Body() dto: CreateLessonDto) {
    return this.teachersService.createLesson(req.user.id, areaId, dto);
  }

  @Delete('my-areas/:areaId/lessons/:lessonId')
  deleteLesson(@Req() req: any, @Param('lessonId') lessonId: string) {
    return this.teachersService.deleteLesson(req.user.id, lessonId);
  }

  @Post('my-areas/:areaId/lessons/:lessonId')
  updateLesson(@Req() req: any, @Param('lessonId') lessonId: string, @Body() dto: { description?: string; duration_minutes?: number }) {
    return this.teachersService.updateLesson(req.user.id, lessonId, dto);
  }

  @Post('my-areas/:areaId/lessons/:lessonId/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadLessonFile(
    @Req() req: any,
    @Param('lessonId') lessonId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_FILE_SIZE,
            message: 'O arquivo excede o tamanho permitido de 500MB.' // Mensagem direta aqui
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.teachersService.uploadLessonFile(
      req.user.id,
      lessonId,
      file.buffer,
      file.mimetype,
      file.originalname,
    );
  }

  @Patch('my-areas/:areaId/ai-settings')
  async updateAiSettings(
    @Req() req: any,
    @Param('areaId') areaId: string,
    @Body() body: { enabled: boolean }
  ) {
    return this.teachersService.toggleAi(req.user.id, areaId);
  }

  @Post('my-areas/:areaId/ai-sync')
  async syncAiKnowledge(
    @Req() req: any,
    @Param('areaId') areaId: string
  ) {
    // Dispara o processo pesado de RAG
    return this.teachersService.syncKnowledgeBase(req.user.id, areaId);
  }

  @Post('my-areas/:areaId/banner')
  @UseInterceptors(FileInterceptor('file'))
  uploadAreaBanner(
    @Req() req: any,
    @Param('areaId') areaId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.teachersService.uploadAreaBanner(
      req.user.id,
      areaId,
      file.buffer,
      file.mimetype,
      file.originalname,
    );
  }

  // ── Professor: alunos ─────────────────────────────────────────────────────

  @Get('my-students')
  getMyStudents(@Req() req: any) {
    return this.teachersService.getMyStudents(req.user.id);
  }

  // ── Professor: Sections, Modules, and Notices ──────────────────────────────

  @Get('my-areas/:areaId/sections')
  getAreaSections(@Req() req: any, @Param('areaId') areaId: string) {
    return this.teachersService.getAreaSections(req.user.id, areaId);
  }

  @Post('my-areas/:areaId/sections')
  createSection(@Req() req: any, @Param('areaId') areaId: string, @Body() dto: any) {
    return this.teachersService.createSection(req.user.id, areaId, dto);
  }

  @Delete('sections/:sectionId')
  deleteSection(@Req() req: any, @Param('sectionId') sectionId: string) {
    return this.teachersService.deleteSection(req.user.id, sectionId);
  }

  @Get('sections/:sectionId/modules')
  getSectionModules(@Req() req: any, @Param('sectionId') sectionId: string) {
    return this.teachersService.getSectionModules(req.user.id, sectionId);
  }

  @Post('sections/:sectionId/modules')
  createModule(@Req() req: any, @Param('sectionId') sectionId: string, @Body() dto: any) {
    return this.teachersService.createModule(req.user.id, sectionId, dto);
  }

  @Delete('modules/:moduleId')
  deleteModule(@Req() req: any, @Param('moduleId') moduleId: string) {
    return this.teachersService.deleteModule(req.user.id, moduleId);
  }

  @Get('my-areas/:areaId/notices')
  getAreaNotices(@Req() req: any, @Param('areaId') areaId: string) {
    return this.teachersService.getAreaNotices(req.user.id, areaId);
  }

  @Post('my-areas/:areaId/notices')
  createNotice(@Req() req: any, @Param('areaId') areaId: string, @Body() dto: any) {
    return this.teachersService.createNotice(req.user.id, areaId, dto);
  }

  @Delete('notices/:noticeId')
  deleteNotice(@Req() req: any, @Param('noticeId') noticeId: string) {
    return this.teachersService.deleteNotice(req.user.id, noticeId);
  }

  // ── Lesson Progress (alunos) ──────────────────────────────────────────────

  @Post('lessons/:lessonId/progress')
  upsertLessonProgress(@Req() req: any, @Param('lessonId') lessonId: string, @Body() dto: { completed: boolean; watched_until_percent?: number }) {
    return this.teachersService.upsertLessonProgress(req.user.id, lessonId, dto.completed, dto.watched_until_percent);
  }

  // ── Lesson Materials ──────────────────────────────────────────────────────

  @Get('lessons/:lessonId/materials')
  getLessonMaterials(@Req() req: any, @Param('lessonId') lessonId: string) {
    return this.teachersService.getLessonMaterials(req.user.id, lessonId);
  }

  @Post('lessons/:lessonId/materials')
  createLessonMaterial(@Req() req: any, @Param('lessonId') lessonId: string, @Body() dto: { type: string; title: string; url: string }) {
    return this.teachersService.createLessonMaterial(req.user.id, lessonId, dto);
  }

  @Post('lessons/:lessonId/materials/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadLessonMaterial(
    @Req() req: any,
    @Param('lessonId') lessonId: string,
    @Query('type') typeParam: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    const type = (typeParam === 'image' || typeParam === 'executable') ? typeParam : 'file';
    return this.teachersService.uploadLessonMaterial(
      req.user.id,
      lessonId,
      file.buffer,
      file.mimetype,
      file.originalname,
      type as 'image' | 'file' | 'executable',
    );
  }

  @Delete('materials/:materialId')
  deleteLessonMaterial(@Req() req: any, @Param('materialId') materialId: string) {
    return this.teachersService.deleteLessonMaterial(req.user.id, materialId);
  }

  // ── Lesson Comments ───────────────────────────────────────────────────────

  @Get('lessons/:lessonId/comments')
  getLessonComments(@Req() req: any, @Param('lessonId') lessonId: string) {
    return this.teachersService.getLessonComments(req.user.id, lessonId);
  }

  @Post('lessons/:lessonId/comments')
  createLessonComment(@Req() req: any, @Param('lessonId') lessonId: string, @Body() dto: { content: string }) {
    return this.teachersService.createLessonComment(req.user.id, lessonId, dto.content);
  }
}