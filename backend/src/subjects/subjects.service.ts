import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SupabaseService } from '../supabase/supabase.service';
import { ProfileService } from '../profile/profile.service';
import { CreateSubjectDto } from './dto/create-subject.dto';

export interface RecommendedSubject {
  title: string;
  suggested_hours: number;
  color_code: string;
  difficulty_level: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const cache = new Map<string, { data: RecommendedSubject[]; expiry: number }>();

@Injectable()
export class SubjectsService {
  private readonly logger = new Logger(SubjectsService.name);
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
      this.logger.warn('OPENAI_API_KEY not set - LLM recommendations will use fallback');
    }
  }

  async getRecommendations(userId: string): Promise<RecommendedSubject[]> {
    const cached = cache.get(userId);
    if (cached && Date.now() < cached.expiry) {
      this.logger.log(`[CACHE HIT] Recommendations for user ${userId}`);
      return cached.data;
    }

    const profile = await this.profileService.getProfile(userId);
    const goals = (profile?.learning_goals as string[]) ?? [];
    const interests = (profile?.interests as string[]) ?? [];
    const hoursPerDay = (profile?.hours_per_day as number) ?? 2;

    if (goals.length === 0 && interests.length === 0) {
      const fallback = this.getFallbackRecommendations();
      cache.set(userId, { data: fallback, expiry: Date.now() + CACHE_TTL_MS });
      return fallback;
    }

    if (!this.openai) {
      const fallback = this.getFallbackRecommendations();
      cache.set(userId, { data: fallback, expiry: Date.now() + CACHE_TTL_MS });
      return fallback;
    }

    try {
      const prompt = `Você é um assistente educacional. Com base nos objetivos e interesses do aluno, sugira entre 4 e 8 matérias/disciplinas para estudo.

Objetivos do aluno: ${goals.join(', ') || 'não informados'}
Interesses: ${interests.join(', ') || 'não informados'}
Horas por dia disponíveis: ${hoursPerDay}h

Retorne APENAS um JSON array, sem markdown, sem explicação. Cada objeto deve ter:
- title: string (nome da matéria)
- suggested_hours: number (meta de horas totais sugerida, entre 10 e 200)
- color_code: string (hex como "#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4")
- difficulty_level: number (1 a 5, 1=fácil 5=difícil)`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content?.trim() ?? '[]';
      const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '')) as RecommendedSubject[];
      const valid = Array.isArray(parsed)
        ? parsed
            .filter((s) => s?.title && typeof s.suggested_hours === 'number')
            .slice(0, 8)
            .map((s) => ({
              title: String(s.title),
              suggested_hours: Math.min(200, Math.max(10, Number(s.suggested_hours))),
              color_code: String(s.color_code || '#4F46E5').startsWith('#') ? s.color_code : '#4F46E5',
              difficulty_level: Math.min(5, Math.max(1, Number(s.difficulty_level) || 3)),
            }))
        : [];

      const result = valid.length > 0 ? valid : this.getFallbackRecommendations();
      cache.set(userId, { data: result, expiry: Date.now() + CACHE_TTL_MS });
      return result;
    } catch (err) {
      this.logger.error(`LLM recommendations failed: ${err?.message}`, err?.stack);
      const fallback = this.getFallbackRecommendations();
      cache.set(userId, { data: fallback, expiry: Date.now() + CACHE_TTL_MS });
      return fallback;
    }
  }

  private getFallbackRecommendations(): RecommendedSubject[] {
    return [
      { title: 'Matemática', suggested_hours: 80, color_code: '#4F46E5', difficulty_level: 4 },
      { title: 'Português', suggested_hours: 60, color_code: '#10B981', difficulty_level: 3 },
      { title: 'Física', suggested_hours: 70, color_code: '#F59E0B', difficulty_level: 4 },
      { title: 'Química', suggested_hours: 60, color_code: '#EF4444', difficulty_level: 3 },
      { title: 'Biologia', suggested_hours: 50, color_code: '#22C55E', difficulty_level: 3 },
      { title: 'História', suggested_hours: 40, color_code: '#8B5CF6', difficulty_level: 2 },
      { title: 'Inglês', suggested_hours: 60, color_code: '#06B6D4', difficulty_level: 3 },
    ].slice(0, 6);
  }

  async getMySubjects(userId: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('subjects')
      .select('id, title, color_code, target_hours, completed_hours, deadline, difficulty_level, is_custom, created_at')
      .eq('student_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Error fetching subjects: ${error.message}`);
      throw new Error(error.message);
    }
    return data ?? [];
  }

  async create(userId: string, dto: CreateSubjectDto) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        student_id: userId,
        title: dto.title,
        color_code: dto.color_code ?? '#4F46E5',
        target_hours: dto.target_hours,
        deadline: dto.deadline ?? null,
        difficulty_level: dto.difficulty_level ?? 3,
        is_custom: dto.is_custom ?? true,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating subject: ${error.message}`);
      throw new Error(error.message);
    }
    return data;
  }
}
