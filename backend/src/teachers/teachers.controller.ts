import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
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
  constructor(private readonly teachersService: TeachersService) {}

  // ── Aluno: navegar áreas ──────────────────────────────────────────────────

  @Get('areas')
  listAllAreas() {
    return this.teachersService.listAllAreas();
  }

  @Get('following')
  listFollowing(@Req() req: any) {
    return this.teachersService.listFollowing(req.user.id);
  }

  @Get('areas/:areaId/lessons')
  getAreaLessons(@Req() req: any, @Param('areaId') areaId: string) {
    return this.teachersService.getAreaLessons(areaId, req.user.id);
  }

  @Post('areas/:areaId/subscribe')
  subscribe(@Req() req: any, @Param('areaId') areaId: string) {
    return this.teachersService.subscribe(req.user.id, areaId);
  }

  @Delete('areas/:areaId/subscribe')
  unsubscribe(@Req() req: any, @Param('areaId') areaId: string) {
    return this.teachersService.unsubscribe(req.user.id, areaId);
  }

  // ── Professor: minha área ─────────────────────────────────────────────────

  @Get('my-area')
  getMyArea(@Req() req: any) {
    return this.teachersService.getMyArea(req.user.id);
  }

  @Post('my-area')
  upsertMyArea(@Req() req: any, @Body() dto: CreateTeacherAreaDto) {
    return this.teachersService.upsertMyArea(req.user.id, dto);
  }

  // ── Professor: aulas ──────────────────────────────────────────────────────

  @Get('my-area/lessons')
  getMyLessons(@Req() req: any) {
    return this.teachersService.getMyLessons(req.user.id);
  }

  @Post('my-area/lessons')
  createLesson(@Req() req: any, @Body() dto: CreateLessonDto) {
    return this.teachersService.createLesson(req.user.id, dto);
  }

  @Delete('my-area/lessons/:lessonId')
  deleteLesson(@Req() req: any, @Param('lessonId') lessonId: string) {
    return this.teachersService.deleteLesson(req.user.id, lessonId);
  }

  @Post('my-area/lessons/:lessonId/upload')
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

  // ── Professor: alunos ─────────────────────────────────────────────────────

  @Get('my-students')
  getMyStudents(@Req() req: any) {
    return this.teachersService.getMyStudents(req.user.id);
  }
}