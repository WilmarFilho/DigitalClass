import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ProfileService } from '../profile/profile.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';

const SUGGESTIONS_CACHE_TTL_MS = 60 * 60 * 1000;
const MIN_SUGGESTION_MINUTES = 15;
const MAX_SUGGESTION_MINUTES = 120;
const DEFAULT_START_MINUTES = 8 * 60;
const MAX_SUBJECTS_PER_DAY = 2;
const suggestionsCache = new Map<string, { data: CalendarSuggestion[]; expiry: number }>();

type CalendarEventRow = {
  scheduled_date: string;
  scheduled_time?: string | null;
  subject_id: string;
  duration_minutes: number;
};

type SubjectPlan = {
  id: string;
  title: string;
  color_code: string;
  difficulty_level: number;
  deadline: string | null;
  target_minutes: number;
  completed_minutes: number;
  remaining_minutes: number;
  progress_ratio: number;
  priority_score: number;
  suggested_session_minutes: number;
  allocated_minutes: number;
};

type DayPlan = {
  date: string;
  totalMinutes: number;
  occupiedRanges: Array<{ start: number; end: number }>;
  subjectIds: Set<string>;
  difficultyLoad: number;
  suggestedCount: number;
};

type CalendarSuggestion = {
  date: string;
  subject_id: string;
  suggested_duration_minutes: number;
  suggested_time: string;
  reason: string;
  subject: {
    id: string;
    title: string;
    color_code: string;
  };
};

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly profileService: ProfileService,
  ) {}

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
    this.invalidateSuggestionsCache(userId, dto.scheduled_date.slice(0, 7));
    return data;
  }

  async delete(userId: string, eventId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: existingEvent } = await supabase
      .from('calendar_events')
      .select('scheduled_date')
      .eq('id', eventId)
      .eq('student_id', userId)
      .maybeSingle();

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('student_id', userId);

    if (error) {
      this.logger.error(`Error deleting calendar event: ${error.message}`);
      throw new Error(error.message);
    }

    if (existingEvent?.scheduled_date) {
      this.invalidateSuggestionsCache(userId, String(existingEvent.scheduled_date).slice(0, 7));
    } else {
      this.invalidateSuggestionsCache(userId);
    }
  }

  async getSuggestions(userId: string, month: string, forceRefresh = false): Promise<CalendarSuggestion[]> {
    const cacheKey = `${userId}:${month}`;

    if (forceRefresh) {
      this.invalidateSuggestionsCache(userId, month);
    }

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
      .select('id, title, color_code, target_hours, completed_hours, completed_minutes, deadline, difficulty_level')
      .eq('student_id', userId);

    if (subjErr || !subjects?.length) {
      return [];
    }

    const { data: existingEvents } = await supabase
      .from('calendar_events')
      .select('scheduled_date, scheduled_time, subject_id, duration_minutes')
      .eq('student_id', userId)
      .gte('scheduled_date', startDate.toISOString().slice(0, 10))
      .lte('scheduled_date', endDate.toISOString().slice(0, 10));

    const profile = await this.profileService.getProfile(userId);
    const hoursPerDay = Math.min(12, Math.max(1, Number(profile?.hours_per_day) || 2));

    const normalizedSubjects = this.buildSubjectPlans(subjects ?? [], today);
    if (normalizedSubjects.length === 0) {
      return [];
    }
    const suggestions = this.buildSmartSuggestions({
      subjects: normalizedSubjects,
      existingEvents: (existingEvents ?? []) as CalendarEventRow[],
      hoursPerDay,
      startDate: today > startDate ? today : startDate,
      endDate,
      referenceDate: today,
    });

    suggestionsCache.set(cacheKey, { data: suggestions, expiry: Date.now() + SUGGESTIONS_CACHE_TTL_MS });
    return suggestions;
  }

  private invalidateSuggestionsCache(userId: string, month?: string) {
    if (month) {
      suggestionsCache.delete(`${userId}:${month}`);
      return;
    }

    for (const key of suggestionsCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        suggestionsCache.delete(key);
      }
    }
  }

  private buildSubjectPlans(subjects: any[], today: Date): SubjectPlan[] {
    return subjects
      .map((subject: any) => {
        const targetMinutes = Math.max(0, Number(subject.target_hours ?? 0) * 60);
        const completedMinutes = Math.max(
          0,
          Number(subject.completed_minutes ?? 0) + Number(subject.completed_hours ?? 0) * 60,
        );
        const remainingMinutes = Math.max(0, targetMinutes - completedMinutes);
        const difficulty = Math.min(5, Math.max(1, Number(subject.difficulty_level) || 3));
        const progressRatio = targetMinutes > 0 ? Math.min(1, completedMinutes / targetMinutes) : 0;
        const deadlinePenalty = this.getDeadlineWeight(subject.deadline ?? null, today, false);
        const suggestedSessionMinutes = Math.min(
          MAX_SUGGESTION_MINUTES,
          Math.max(
            30,
            Math.round(
              Math.min(
                remainingMinutes,
                35 + difficulty * 12 + (progressRatio < 0.35 ? 15 : 0) + (deadlinePenalty >= 1.5 ? 15 : 0),
              ) / 15,
            ) * 15,
          ),
        );

        return {
          id: subject.id,
          title: subject.title,
          color_code: subject.color_code || '#4F46E5',
          difficulty_level: difficulty,
          deadline: subject.deadline ?? null,
          target_minutes: targetMinutes,
          completed_minutes: completedMinutes,
          remaining_minutes: remainingMinutes,
          progress_ratio: progressRatio,
          priority_score:
            remainingMinutes / 60 +
            difficulty * 20 +
            (1 - progressRatio) * 30 +
            deadlinePenalty * 40,
          suggested_session_minutes: suggestedSessionMinutes,
          allocated_minutes: 0,
        } satisfies SubjectPlan;
      })
      .filter((subject) => subject.remaining_minutes >= MIN_SUGGESTION_MINUTES)
      .sort((a, b) => b.priority_score - a.priority_score);
  }

  private buildSmartSuggestions(params: {
    subjects: SubjectPlan[];
    existingEvents: CalendarEventRow[];
    hoursPerDay: number;
    startDate: Date;
    endDate: Date;
    referenceDate: Date;
  }): CalendarSuggestion[] {
    const { subjects, existingEvents, hoursPerDay, startDate, endDate, referenceDate } = params;
    const dayPlans = this.buildDayPlans(existingEvents, startDate, endDate);
    const maxDailyMinutes = Math.max(60, hoursPerDay * 60);
    const suggestions: CalendarSuggestion[] = [];

    for (const dayPlan of dayPlans.values()) {
      let attempts = 0;
      while (
        dayPlan.totalMinutes + MIN_SUGGESTION_MINUTES <= maxDailyMinutes &&
        dayPlan.suggestedCount < MAX_SUBJECTS_PER_DAY &&
        attempts < subjects.length
      ) {
        attempts += 1;

        const candidate = this.pickBestSubjectForDay(subjects, dayPlan, referenceDate, maxDailyMinutes);
        if (!candidate) {
          break;
        }

        const duration = this.getSuggestionDuration(candidate, dayPlan, maxDailyMinutes);
        if (duration < MIN_SUGGESTION_MINUTES) {
          continue;
        }

        const startMinutes = this.findNextAvailableStart(dayPlan.occupiedRanges, duration);
        if (startMinutes === null) {
          break;
        }

        candidate.allocated_minutes += duration;
        dayPlan.totalMinutes += duration;
        dayPlan.suggestedCount += 1;
        dayPlan.subjectIds.add(candidate.id);
        dayPlan.difficultyLoad += candidate.difficulty_level;
        dayPlan.occupiedRanges.push({ start: startMinutes, end: startMinutes + duration });
        dayPlan.occupiedRanges.sort((a, b) => a.start - b.start);

        suggestions.push({
          date: dayPlan.date,
          subject_id: candidate.id,
          suggested_duration_minutes: duration,
          suggested_time: this.minutesToTime(startMinutes),
          reason: this.buildSuggestionReason(candidate, dayPlan.date, referenceDate),
          subject: {
            id: candidate.id,
            title: candidate.title,
            color_code: candidate.color_code,
          },
        });
      }
    }

    return suggestions.sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return a.suggested_time.localeCompare(b.suggested_time);
    });
  }

  private buildDayPlans(
    existingEvents: CalendarEventRow[],
    startDate: Date,
    endDate: Date,
  ): Map<string, DayPlan> {
    const dayPlans = new Map<string, DayPlan>();

    for (
      const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      cursor <= endDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const date = this.formatDate(cursor);
      dayPlans.set(date, {
        date,
        totalMinutes: 0,
        occupiedRanges: [],
        subjectIds: new Set<string>(),
        difficultyLoad: 0,
        suggestedCount: 0,
      });
    }

    for (const event of existingEvents) {
      const plan = dayPlans.get(String(event.scheduled_date));
      if (!plan) continue;

      const duration = Math.max(MIN_SUGGESTION_MINUTES, Number(event.duration_minutes) || 0);
      const startMinutes = event.scheduled_time
        ? this.timeToMinutes(event.scheduled_time)
        : this.findNextAvailableStart(plan.occupiedRanges, duration) ?? DEFAULT_START_MINUTES;

      plan.totalMinutes += duration;
      plan.subjectIds.add(event.subject_id);
      plan.occupiedRanges.push({ start: startMinutes, end: startMinutes + duration });
      plan.occupiedRanges.sort((a, b) => a.start - b.start);
    }

    return dayPlans;
  }

  private pickBestSubjectForDay(
    subjects: SubjectPlan[],
    dayPlan: DayPlan,
    referenceDate: Date,
    maxDailyMinutes: number,
  ): SubjectPlan | null {
    const candidate = subjects
      .filter((subject) => {
        if (subject.remaining_minutes - subject.allocated_minutes < MIN_SUGGESTION_MINUTES) return false;
        if (dayPlan.subjectIds.has(subject.id)) return false;
        if (dayPlan.totalMinutes + MIN_SUGGESTION_MINUTES > maxDailyMinutes) return false;
        if (subject.deadline && dayPlan.date > subject.deadline && this.getDeadlineWeight(subject.deadline, referenceDate, true) > 0) {
          return false;
        }
        return true;
      })
      .map((subject) => ({
        subject,
        score: this.scoreSubjectForDay(subject, dayPlan, referenceDate),
      }))
      .sort((a, b) => b.score - a.score)[0];

    return candidate?.subject ?? null;
  }

  private scoreSubjectForDay(subject: SubjectPlan, dayPlan: DayPlan, referenceDate: Date): number {
    const remainingMinutes = Math.max(0, subject.remaining_minutes - subject.allocated_minutes);
    const allocatedRatio = subject.remaining_minutes > 0 ? subject.allocated_minutes / subject.remaining_minutes : 1;
    const deadlineWeight = this.getDeadlineWeight(subject.deadline, this.parseDate(dayPlan.date), true);
    const difficultyWeight = subject.difficulty_level * 14;
    const progressWeight = (1 - subject.progress_ratio) * 26;
    const remainingWeight = remainingMinutes / 30;
    const balancePenalty = allocatedRatio * 30;
    const overloadPenalty =
      subject.difficulty_level >= 4 && dayPlan.difficultyLoad >= 4
        ? 50
        : subject.difficulty_level >= 4 && dayPlan.subjectIds.size > 0
          ? 18
          : 0;
    const proximityBonus = Math.max(0, 10 - this.diffInDays(referenceDate, this.parseDate(dayPlan.date)));

    return deadlineWeight * 40 + difficultyWeight + progressWeight + remainingWeight + proximityBonus - balancePenalty - overloadPenalty;
  }

  private getSuggestionDuration(subject: SubjectPlan, dayPlan: DayPlan, maxDailyMinutes: number): number {
    const remainingMinutes = Math.max(0, subject.remaining_minutes - subject.allocated_minutes);
    const remainingDayCapacity = Math.max(0, maxDailyMinutes - dayPlan.totalMinutes);
    const rawDuration = Math.min(
      remainingMinutes,
      remainingDayCapacity,
      subject.suggested_session_minutes,
    );

    const rounded = Math.floor(rawDuration / 15) * 15;
    return Math.min(MAX_SUGGESTION_MINUTES, Math.max(MIN_SUGGESTION_MINUTES, rounded));
  }

  private buildSuggestionReason(subject: SubjectPlan, date: string, referenceDate: Date): string {
    const reasons: string[] = [];
    const daysToDeadline = subject.deadline ? this.diffInDays(this.parseDate(date), this.parseDate(subject.deadline)) : null;

    if (daysToDeadline !== null && daysToDeadline <= 7) {
      reasons.push('prazo próximo');
    }
    if (subject.difficulty_level >= 4) {
      reasons.push('alta dificuldade');
    }
    if (subject.progress_ratio < 0.4) {
      reasons.push('baixo progresso');
    }
    if (subject.remaining_minutes - subject.allocated_minutes > 240) {
      reasons.push('carga pendente alta');
    }
    if (reasons.length === 0 && this.diffInDays(referenceDate, this.parseDate(date)) <= 2) {
      reasons.push('equilíbrio da semana');
    }

    return reasons.slice(0, 2).join(' • ') || 'equilíbrio da semana';
  }

  private getDeadlineWeight(deadline: string | null, referenceDate: Date, useReferenceDate: boolean): number {
    if (!deadline) return 0.35;

    const daysUntilDeadline = this.diffInDays(
      useReferenceDate ? referenceDate : this.stripTime(referenceDate),
      this.parseDate(deadline),
    );

    if (daysUntilDeadline < 0) return 1.9;
    if (daysUntilDeadline <= 3) return 1.8;
    if (daysUntilDeadline <= 7) return 1.55;
    if (daysUntilDeadline <= 14) return 1.2;
    if (daysUntilDeadline <= 30) return 0.8;
    return 0.45;
  }

  private findNextAvailableStart(
    occupiedRanges: Array<{ start: number; end: number }>,
    durationMinutes: number,
  ): number | null {
    const sorted = [...occupiedRanges].sort((a, b) => a.start - b.start);
    let cursor = DEFAULT_START_MINUTES;

    for (const range of sorted) {
      if (cursor + durationMinutes <= range.start) {
        return cursor;
      }
      cursor = Math.max(cursor, range.end);
    }

    return cursor + durationMinutes <= 23 * 60 + 45 ? cursor : null;
  }

  private timeToMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(value: number): string {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private parseDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private stripTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private diffInDays(start: Date, end: Date): number {
    const startMs = this.stripTime(start).getTime();
    const endMs = this.stripTime(end).getTime();
    return Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
  }
}
