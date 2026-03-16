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

  @Post('my-areas/:areaId/lessons/:lessonId/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadLessonFile(
    @Req() req: any,
    @Param('lessonId') lessonId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
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
}