import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTeacherAreaDto } from './dto/create-teacher-area.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';

export const LESSONS_BUCKET = 'lessons';

@Injectable()
export class TeachersService {
  private readonly logger = new Logger(TeachersService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private supabase() {
    return this.supabaseService.getClient();
  }

  private async assertTeacher(userId: string) {
    const { data } = await this.supabase()
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (data?.role !== 'teacher') {
      throw new ForbiddenException('Apenas professores podem acessar este recurso');
    }
  }

  // ─── Área pública de professores (alunos) ──────────────────────────────────

  /** Lista todas as áreas públicas de professores com info do professor */
  async listAllAreas() {
    const { data, error } = await this.supabase()
      .from('teacher_areas')
      .select(`
        id, title, description, color_code, monthly_price, banner_url, is_private, created_at,
        profiles!teacher_id ( id, full_name, avatar_url )
      `)
      .eq('is_private', false)
      .order('created_at', { ascending: false });

    if (error) this.logger.error(`listAllAreas: ${error.message}`);
    return (data ?? []).map((area) => this.formatArea(area));
  }

  /** Áreas que o aluno segue */
  async listFollowing(studentId: string) {
    const { data, error } = await this.supabase()
      .from('teacher_subscriptions')
      .select(`
        subscribed_at,
        teacher_areas (
          id, title, description, color_code, monthly_price, banner_url, created_at,
          profiles!teacher_id ( id, full_name, avatar_url )
        )
      `)
      .eq('student_id', studentId);

    if (error) this.logger.error(`listFollowing: ${error.message}`);

    return (data ?? []).map((row: any) => ({
      subscribed_at: row.subscribed_at,
      ...this.formatArea(row.teacher_areas),
    }));
  }

  /** Quantidade de alunos em cada área */
  async getAreaStudentCount(areaId: string): Promise<number> {
    const { count } = await this.supabase()
      .from('teacher_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_area_id', areaId);
    return count ?? 0;
  }

  /** Aulas de uma área (só se o aluno for assinante ou for o dono) */
  async getAreaLessons(areaId: string, userId: string) {
    const { data: area } = await this.supabase()
      .from('teacher_areas')
      .select('teacher_id')
      .eq('id', areaId)
      .maybeSingle();

    if (!area) throw new NotFoundException('Área não encontrada');

    const isOwner = area.teacher_id === userId;
    if (!isOwner) {
      const { data: sub } = await this.supabase()
        .from('teacher_subscriptions')
        .select('student_id')
        .eq('student_id', userId)
        .eq('teacher_area_id', areaId)
        .maybeSingle();
      if (!sub) throw new ForbiddenException('Assine esta área para acessar as aulas');
    }

    const { data } = await this.supabase()
      .from('lessons')
      .select('id, title, description, type, content_url, duration_minutes, order_index, created_at')
      .eq('area_id', areaId)
      .order('order_index', { ascending: true });

    return data ?? [];
  }

  // ─── Subscrições ───────────────────────────────────────────────────────────

  async subscribe(studentId: string, areaId: string) {
    const { error } = await this.supabase()
      .from('teacher_subscriptions')
      .upsert({ student_id: studentId, teacher_area_id: areaId });
    if (error) throw new Error(error.message);
    return { subscribed: true };
  }

  async unsubscribe(studentId: string, areaId: string) {
    const { error } = await this.supabase()
      .from('teacher_subscriptions')
      .delete()
      .eq('student_id', studentId)
      .eq('teacher_area_id', areaId);
    if (error) throw new Error(error.message);
    return { subscribed: false };
  }

  // ─── Área do professor ─────────────────────────────────────────────────────

  async getMyArea(teacherId: string) {
    await this.assertTeacher(teacherId);

    const { data } = await this.supabase()
      .from('teacher_areas')
      .select('id, title, description, color_code, monthly_price, banner_url, is_private, created_at')
      .eq('teacher_id', teacherId)
      .maybeSingle();

    return data ?? null;
  }

  async upsertMyArea(teacherId: string, dto: CreateTeacherAreaDto) {
    await this.assertTeacher(teacherId);

    const { data: existing } = await this.supabase()
      .from('teacher_areas')
      .select('id')
      .eq('teacher_id', teacherId)
      .maybeSingle();

    const payload = {
      teacher_id: teacherId,
      title: dto.title,
      description: dto.description ?? null,
      color_code: dto.color_code ?? '#4F46E5',
      monthly_price: dto.monthly_price ?? 0,
      is_private: dto.is_private ?? false,
    };

    if (existing) {
      const { data, error } = await this.supabase()
        .from('teacher_areas')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    const { data, error } = await this.supabase()
      .from('teacher_areas')
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  // ─── Aulas ─────────────────────────────────────────────────────────────────

  async getMyLessons(teacherId: string) {
    await this.assertTeacher(teacherId);

    const { data: area } = await this.supabase()
      .from('teacher_areas')
      .select('id')
      .eq('teacher_id', teacherId)
      .maybeSingle();

    if (!area) return [];

    const { data } = await this.supabase()
      .from('lessons')
      .select('id, title, description, type, content_url, duration_minutes, order_index, created_at')
      .eq('area_id', area.id)
      .order('order_index', { ascending: true });

    return data ?? [];
  }

  async createLesson(teacherId: string, dto: CreateLessonDto) {
    await this.assertTeacher(teacherId);

    const { data: area } = await this.supabase()
      .from('teacher_areas')
      .select('id')
      .eq('teacher_id', teacherId)
      .maybeSingle();

    if (!area) throw new NotFoundException('Crie sua área de estudante primeiro');

    const { data, error } = await this.supabase()
      .from('lessons')
      .insert({
        area_id: area.id,
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type ?? 'video',
        order_index: dto.order_index ?? 0,
        duration_minutes: dto.duration_minutes ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async deleteLesson(teacherId: string, lessonId: string) {
    await this.assertTeacher(teacherId);

    const { data: lesson } = await this.supabase()
      .from('lessons')
      .select('area_id')
      .eq('id', lessonId)
      .maybeSingle();

    if (!lesson) throw new NotFoundException('Aula não encontrada');

    const { data: area } = await this.supabase()
      .from('teacher_areas')
      .select('teacher_id')
      .eq('id', lesson.area_id)
      .maybeSingle();

    if (area?.teacher_id !== teacherId) throw new ForbiddenException();

    const { error } = await this.supabase()
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (error) throw new Error(error.message);
    return { deleted: true };
  }

  async uploadLessonFile(
    teacherId: string,
    lessonId: string,
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
  ) {
    await this.assertTeacher(teacherId);

    const ext = originalName.split('.').pop() ?? 'bin';
    const path = `${teacherId}/${lessonId}.${ext}`;

    const { data: uploadData, error: uploadError } = await this.supabase()
      .storage
      .from(LESSONS_BUCKET)
      .upload(path, fileBuffer, { contentType: mimeType, upsert: true });

    if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`);

    const { data: urlData } = this.supabase()
      .storage
      .from(LESSONS_BUCKET)
      .getPublicUrl(uploadData.path);

    const publicUrl = urlData.publicUrl;

    const fileType = mimeType.startsWith('video') ? 'video' : 'pdf';
    const { data, error } = await this.supabase()
      .from('lessons')
      .update({ content_url: publicUrl, type: fileType })
      .eq('id', lessonId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // ─── Alunos do professor ────────────────────────────────────────────────────

  async getMyStudents(teacherId: string) {
    await this.assertTeacher(teacherId);

    const { data: area } = await this.supabase()
      .from('teacher_areas')
      .select('id, monthly_price')
      .eq('teacher_id', teacherId)
      .maybeSingle();

    if (!area) return { students: [], total_revenue: 0, monthly_revenue: 0 };

    const { data: subs, error } = await this.supabase()
      .from('teacher_subscriptions')
      .select(`
        subscribed_at,
        profiles!student_id ( id, full_name, avatar_url, created_at )
      `)
      .eq('teacher_area_id', area.id)
      .order('subscribed_at', { ascending: false });

    if (error) this.logger.error(`getMyStudents: ${error.message}`);

    const students = (subs ?? []).map((s: any) => ({
      id: s.profiles?.id,
      full_name: s.profiles?.full_name ?? 'Aluno',
      avatar_url: s.profiles?.avatar_url ?? null,
      subscribed_at: s.subscribed_at,
    }));

    const monthlyRevenue = students.length * Number(area.monthly_price ?? 0);

    return {
      students,
      active_count: students.length,
      monthly_revenue: monthlyRevenue,
      total_revenue: monthlyRevenue * 3, // Mock de 3 meses
    };
  }

  // ─── util ──────────────────────────────────────────────────────────────────

  private formatArea(area: any) {
    if (!area) return null;
    return {
      id: area.id,
      title: area.title,
      description: area.description,
      color_code: area.color_code ?? '#4F46E5',
      monthly_price: Number(area.monthly_price ?? 0),
      banner_url: area.banner_url,
      created_at: area.created_at,
      teacher: {
        id: area.profiles?.id,
        full_name: area.profiles?.full_name ?? 'Professor',
        avatar_url: area.profiles?.avatar_url ?? null,
      },
    };
  }
}