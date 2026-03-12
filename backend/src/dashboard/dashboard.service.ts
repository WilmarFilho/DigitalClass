import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async getStats(userId: string) {
    const supabase = this.supabaseService.getClient();
    const today = new Date().toISOString().slice(0, 10);

    const [profileRes, subjectsRes, sessionsTodayRes, calendarTodayRes] = await Promise.all([
      supabase.from('profiles').select('hours_per_day').eq('id', userId).maybeSingle(),
      supabase.from('subjects').select('id').eq('student_id', userId),
      supabase
        .from('study_sessions')
        .select('duration_minutes')
        .eq('student_id', userId)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`),
      supabase
        .from('calendar_events')
        .select('duration_minutes')
        .eq('student_id', userId)
        .eq('scheduled_date', today)
        .eq('status', 'completed'),
    ]);

    const hoursPerDay = (profileRes.data?.hours_per_day as number) ?? 2;
    const activeSubjects = subjectsRes.data?.length ?? 0;

    const sessionMinutesToday =
      sessionsTodayRes.data?.reduce((s, r) => s + ((r.duration_minutes as number) ?? 0), 0) ?? 0;
    const calendarMinutesToday =
      calendarTodayRes.data?.reduce((s, r) => s + ((r.duration_minutes as number) ?? 0), 0) ?? 0;
    const totalMinutesToday = sessionMinutesToday + calendarMinutesToday;

    const hoursToday = Math.floor(totalMinutesToday / 60);
    const minsToday = totalMinutesToday % 60;
    const hoursTodayStr = hoursToday > 0 ? `${hoursToday}h ${minsToday}min` : `${minsToday}min`;

    const streak = await this.getStreak(userId);

    return {
      hours_today: hoursTodayStr,
      daily_goal: `${hoursPerDay}h`,
      streak_days: streak,
      active_subjects: activeSubjects,
    };
  }

  private async getStreak(userId: string): Promise<number> {
    const supabase = this.supabaseService.getClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('created_at, duration_minutes')
      .eq('student_id', userId)
      .gte('created_at', this.daysAgo(84))
      .order('created_at', { ascending: false });

    const { data: completedEvents } = await supabase
      .from('calendar_events')
      .select('scheduled_date')
      .eq('student_id', userId)
      .eq('status', 'completed')
      .gte('scheduled_date', this.daysAgo(84).slice(0, 10));

    const activeDays = new Set<string>();

    for (const s of sessions ?? []) {
      const d = (s.created_at as string).slice(0, 10);
      if ((s.duration_minutes as number) > 0) activeDays.add(d);
    }
    for (const e of completedEvents ?? []) {
      activeDays.add(e.scheduled_date as string);
    }

    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = d.toISOString().slice(0, 10);
      if (activeDays.has(dateStr)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  private daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  async getConsistency(userId: string): Promise<number[]> {
    const WEEKS = 12;
    const DAYS_PER_WEEK = 7;
    const totalCells = WEEKS * DAYS_PER_WEEK;

    const supabase = this.supabaseService.getClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - totalCells);

    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('created_at, duration_minutes')
      .eq('student_id', userId)
      .gte('created_at', startDate.toISOString());

    const { data: completedEvents } = await supabase
      .from('calendar_events')
      .select('scheduled_date, duration_minutes')
      .eq('student_id', userId)
      .eq('status', 'completed')
      .gte('scheduled_date', startDate.toISOString().slice(0, 10));

    const minutesByDate = new Map<string, number>();
    for (const s of sessions ?? []) {
      const d = (s.created_at as string).slice(0, 10);
      const mins = (s.duration_minutes as number) ?? 0;
      minutesByDate.set(d, (minutesByDate.get(d) ?? 0) + mins);
    }
    for (const e of completedEvents ?? []) {
      const d = e.scheduled_date as string;
      const mins = (e.duration_minutes as number) ?? 0;
      minutesByDate.set(d, (minutesByDate.get(d) ?? 0) + mins);
    }

    const levelForMinutes = (mins: number) => {
      if (mins <= 0) return 0;
      if (mins < 15) return 1;
      if (mins < 30) return 2;
      if (mins < 60) return 3;
      return 4;
    };

    const contributions: number[] = Array(totalCells).fill(0);
    const startSunday = new Date(startDate);
    startSunday.setDate(startSunday.getDate() - startSunday.getDay());

    for (let col = 0; col < WEEKS; col++) {
      for (let row = 0; row < DAYS_PER_WEEK; row++) {
        const d = new Date(startSunday);
        d.setDate(d.getDate() + col * DAYS_PER_WEEK + row);
        const dateStr = d.toISOString().slice(0, 10);
        const mins = minutesByDate.get(dateStr) ?? 0;
        contributions[col * DAYS_PER_WEEK + row] = levelForMinutes(mins);
      }
    }
    return contributions;
  }

  async getLastAssets(userId: string, limit = 5) {
    const supabase = this.supabaseService.getClient();

    const { data: sessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select('id')
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (sessionsError) {
      this.logger.error(
        `getLastAssets - error fetching sessions for user ${userId}: ${sessionsError.message}`,
      );
      return { flashcards: [], quizzes: [] };
    }

    const sessionIds = (sessions ?? []).map((s) => s.id);
    if (sessionIds.length === 0) {
      this.logger.log(`getLastAssets - no sessions found for user ${userId}`);
      return { flashcards: [], quizzes: [] };
    }

    // Busca sessões com subject_id para montar o mapa
    const { data: sessionsWithSubjectId, error: swsError } = await supabase
      .from('study_sessions')
      .select('id, subject_id')
      .in('id', sessionIds);

    if (swsError) {
      this.logger.error(`getLastAssets - error fetching sessions with subject_id: ${swsError.message}`);
    }


    console.log('aaa', sessionsWithSubjectId);

    // Busca nomes das matérias
    const subjectIds = [...new Set((sessionsWithSubjectId ?? []).map((s) => s.subject_id).filter(Boolean))] as string[];
    const subjectTitleMap = new Map<string, string>();
    if (subjectIds.length > 0) {
      const { data: subjectsData, error: subjError } = await supabase
        .from('subjects')
        .select('id, title')
        .in('id', subjectIds);
      if (subjError) {
        this.logger.error(`getLastAssets - error fetching subjects: ${subjError.message}`);
      }
      for (const sub of subjectsData ?? []) {
        subjectTitleMap.set(sub.id, sub.title);
      }
    }

    // Mapa sessionId → nome da matéria
    const sessionSubjectMap = new Map<string, string>();
    for (const s of sessionsWithSubjectId ?? []) {
      const title = s.subject_id ? (subjectTitleMap.get(s.subject_id) ?? 'Matéria') : 'Matéria';
      sessionSubjectMap.set(s.id, title);
    }

    const { data: assets, error: assetsError } = await supabase
      .from('study_assets')
      .select('id, type, question, session_id')
      .in('session_id', sessionIds)
      .limit(limit * 4);

    if (assetsError) {
      this.logger.error(`getLastAssets - error fetching assets: ${assetsError.message}`);
      return { flashcards: [], quizzes: [] };
    }

    this.logger.log(`getLastAssets - found ${(assets ?? []).length} assets for user ${userId}`);

    const flashcards: Array<{ id: string; question: string; subject: string }> = [];
    const quizSubjectsSeen = new Set<string>();
    const quizzes: Array<{ id: string; title: string; subject: string }> = [];

    for (const a of assets ?? []) {
      const subjectName = sessionSubjectMap.get(a.session_id as string) ?? 'Matéria';

      if (a.type === 'flashcard' && flashcards.length < limit) {
        flashcards.push({
          id: a.id,
          question: (a.question as string)?.slice(0, 60) ?? '?',
          subject: subjectName,
        });
      } else if (a.type === 'quiz_question' && quizzes.length < limit && !quizSubjectsSeen.has(subjectName)) {
        quizSubjectsSeen.add(subjectName);
        quizzes.push({
          id: a.id,
          title: `Questões - ${subjectName}`,
          subject: subjectName,
        });
      }
    }

    return { flashcards, quizzes };
  }
}
