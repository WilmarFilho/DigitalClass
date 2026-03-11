import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SupabaseService } from '../supabase/supabase.service';
import { ProfileService } from '../profile/profile.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';

const SUGGESTIONS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
const suggestionsCache = new Map<string, { data: any[]; expiry: number }>();

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private openai: OpenAI | null = null;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly profileService: ProfileService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OPENAI_API_KEY not set - calendar suggestions will use fallback');
    }
  }

  async getEvents(userId: string, month: string): Promise<any[]> {
    const [year, m] = month.split('-').map(Number);
    const start = new Date(year, m - 1, 1).toISOString().slice(0, 10);
    const end = new Date(year, m, 0).toISOString().slice(0, 10);

    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        id,
        subject_id,
        scheduled_date,
        scheduled_time,
        duration_minutes,
        status,
        created_at,
        subjects (
          id,
          title,
          color_code
        )
      `)
      .eq('student_id', userId)
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .order('scheduled_date', { ascending: true });

    if (error) {
      this.logger.error(`Error fetching calendar events: ${error.message}`);
      throw new Error(error.message);
    }
    return data ?? [];
  }

  async create(userId: string, dto: CreateCalendarEventDto) {
    const supabase = this.supabaseService.getClient();

    const { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', dto.subject_id)
      .eq('student_id', userId)
      .single();

    if (!subject) {
      throw new Error('Matéria não encontrada');
    }

    const insertData: Record<string, unknown> = {
      student_id: userId,
      subject_id: dto.subject_id,
      scheduled_date: dto.scheduled_date,
      duration_minutes: dto.duration_minutes,
      status: dto.status ?? 'pending',
    };
    if (dto.scheduled_time) {
      insertData.scheduled_time = dto.scheduled_time;
    }
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(insertData)
      .select(`
        id,
        subject_id,
        scheduled_date,
        scheduled_time,
        duration_minutes,
        status,
        subjects (
          id,
          title,
          color_code
        )
      `)
      .single();

    if (error) {
      this.logger.error(`Error creating calendar event: ${error.message}`);
      throw new Error(error.message);
    }
    return data;
  }

  async delete(userId: string, eventId: string) {
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('student_id', userId);

    if (error) {
      this.logger.error(`Error deleting calendar event: ${error.message}`);
      throw new Error(error.message);
    }
  }

  /**
   * Sugestões inteligentes via LLM: considera horas restantes, deadline,
   * dificuldade, intercalação e agenda existente.
   */
  async getSuggestions(userId: string, month: string): Promise<any[]> {
    const cacheKey = `${userId}:${month}`;
    const cached = suggestionsCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      this.logger.log(`[CACHE HIT] Suggestions for ${cacheKey}`);
      return cached.data;
    }

    const [year, m] = month.split('-').map(Number);
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const supabase = this.supabaseService.getClient();

    const { data: subjects, error: subjErr } = await supabase
      .from('subjects')
      .select('id, title, color_code, target_hours, completed_hours, deadline, difficulty_level')
      .eq('student_id', userId);

    if (subjErr || !subjects?.length) {
      return [];
    }

    const { data: existingEvents } = await supabase
      .from('calendar_events')
      .select('scheduled_date, subject_id, duration_minutes')
      .eq('student_id', userId)
      .gte('scheduled_date', startDate.toISOString().slice(0, 10))
      .lte('scheduled_date', endDate.toISOString().slice(0, 10));

    const profile = await this.profileService.getProfile(userId);
    const hoursPerDay = (profile?.hours_per_day as number) ?? 2;

    const subjectsWithRemaining = subjects
      .map((s: any) => {
        const remaining = Math.max(0, ((s.target_hours ?? 0) - (s.completed_hours ?? 0)) * 60);
        return { ...s, remaining_minutes: remaining };
      })
      .filter((s: any) => s.remaining_minutes >= 15);

    if (subjectsWithRemaining.length === 0) {
      return [];
    }

    if (this.openai) {
      try {
        const prompt = `Você é um especialista em planejamento de estudos. Sugira em quais dias do mês ${m}/${year} o aluno deve estudar cada matéria.

MATÉRIAS (com horas restantes e prazo):
${subjectsWithRemaining
  .map(
    (s: any) =>
      `- ${s.title} (id: ${s.id}): ${Math.round(s.remaining_minutes / 60)}h restantes, prazo: ${s.deadline ?? 'sem prazo'}, dificuldade: ${s.difficulty_level ?? 3}/5`
  )
  .join('\n')}

EVENTOS JÁ AGENDADOS NO MÊS:
${(existingEvents ?? []).length > 0 ? (existingEvents as any[]).map((e: any) => `- ${e.scheduled_date}: matéria ${e.subject_id} (${e.duration_minutes}min)`).join('\n') : 'Nenhum'}

DISPONIBILIDADE: até ${hoursPerDay}h de estudo por dia.
HOJE: ${today.toISOString().slice(0, 10)}. Não sugira dias no passado.

Regras:
1. Priorize matérias com deadline próximo e/ou mais difíceis
2. Intercale matérias difíceis com fáceis (não coloque 2 difíceis no mesmo dia)
3. Não sugira o mesmo dia+matéria já agendado
4. Distribua proporcionalmente: quem tem mais horas restantes recebe mais dias
5. Sessões entre 30 e 120 minutos
6. Máximo 2 matérias por dia

Retorne APENAS um JSON array. Cada objeto: { "date": "YYYY-MM-DD", "subject_id": "uuid", "suggested_duration_minutes": number }
Sem markdown, sem explicação.`;

        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
        });

        const content = completion.choices[0]?.message?.content?.trim() ?? '[]';
        const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '')) as Array<{
          date: string;
          subject_id: string;
          suggested_duration_minutes: number;
        }>;

        const subjectMap = new Map(subjects.map((s: any) => [s.id, s]));
        const existingSet = new Set(
          (existingEvents ?? []).map((e: any) => `${e.scheduled_date}:${e.subject_id}`)
        );
        const startStr = startDate.toISOString().slice(0, 10);
        const endStr = endDate.toISOString().slice(0, 10);
        const todayStr = today.toISOString().slice(0, 10);

        const valid = parsed
          .filter((item: any) => {
            if (!item.date || !item.subject_id) return false;
            const subj = subjectMap.get(item.subject_id);
            if (!subj) return false;
            if (item.date < todayStr) return false;
            if (item.date < startStr || item.date > endStr) return false;
            if (existingSet.has(`${item.date}:${item.subject_id}`)) return false;
            const dur = Math.min(120, Math.max(15, Number(item.suggested_duration_minutes) || 60));
            item.suggested_duration_minutes = dur;
            return true;
          })
          .map((item: any) => {
            const subj = subjectMap.get(item.subject_id)!;
            return {
              date: item.date,
              subject_id: item.subject_id,
              suggested_duration_minutes: item.suggested_duration_minutes,
              subject: {
                id: subj.id,
                title: subj.title,
                color_code: subj.color_code || '#4F46E5',
              },
            };
          });

        const result = valid.sort((a: any, b: any) => a.date.localeCompare(b.date));
        suggestionsCache.set(cacheKey, { data: result, expiry: Date.now() + SUGGESTIONS_CACHE_TTL_MS });
        return result;
      } catch (err) {
        this.logger.error(`LLM suggestions failed: ${(err as Error)?.message}`);
      }
    }

    const fallback = this.getSuggestionsFallback(
      subjectsWithRemaining,
      existingEvents ?? [],
      year,
      m,
      today
    );
    suggestionsCache.set(cacheKey, { data: fallback, expiry: Date.now() + SUGGESTIONS_CACHE_TTL_MS });
    return fallback;
  }

  private getSuggestionsFallback(
    subjects: any[],
    existingEvents: any[],
    year: number,
    m: number,
    today: Date
  ): any[] {
    const existingByDateSubject = new Set(
      existingEvents.map((e: any) => `${e.scheduled_date}:${e.subject_id}`)
    );
    const endDate = new Date(year, m, 0);
    const firstDay = today <= new Date(year, m - 1, 1) ? 1 : today.getDate();
    const suggestions: any[] = [];

    for (const subj of subjects) {
      const remaining = subj.remaining_minutes;
      const daysAvailable: number[] = [];
      for (let d = firstDay; d <= endDate.getDate(); d++) {
        const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (!existingByDateSubject.has(`${dateStr}:${subj.id}`)) daysAvailable.push(d);
      }
      if (daysAvailable.length === 0) continue;

      const totalSlots = Math.min(Math.ceil(remaining / 60), daysAvailable.length * 2);
      const duration = Math.max(15, Math.min(120, Math.round(remaining / totalSlots)));
      const step = Math.max(1, Math.floor(daysAvailable.length / totalSlots));
      const used = new Set<string>();

      for (let i = 0; i < totalSlots; i++) {
        const day = daysAvailable[Math.min(i * step, daysAvailable.length - 1)];
        const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const key = `${dateStr}:${subj.id}`;
        if (used.has(key)) continue;
        used.add(key);
        existingByDateSubject.add(key);
        suggestions.push({
          date: dateStr,
          subject_id: subj.id,
          suggested_duration_minutes: duration,
          subject: { id: subj.id, title: subj.title, color_code: subj.color_code || '#4F46E5' },
        });
      }
    }
    return suggestions.sort((a, b) => a.date.localeCompare(b.date));
  }
}
