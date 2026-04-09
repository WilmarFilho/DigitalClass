import { ProfileService } from '../profile/profile.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  const createLocalDate = (year: number, month: number, day: number) =>
    new Date(year, month - 1, day);

  const createService = () => {
    const supabaseService = {
      getClient: jest.fn(),
    } as unknown as SupabaseService;

    const profileService = {
      getProfile: jest.fn(),
    } as unknown as ProfileService;

    return new CalendarService(supabaseService, profileService);
  };

  const baseDayPlan = () => ({
    date: '2026-04-10',
    totalMinutes: 0,
    occupiedRanges: [] as Array<{ start: number; end: number }>,
    subjectIds: new Set<string>(),
    difficultyLoad: 0,
    suggestedCount: 0,
  });

  const baseSubject = (overrides: Record<string, unknown> = {}) => ({
    id: 'subject-1',
    title: 'Matemática',
    color_code: '#4F46E5',
    difficulty_level: 3,
    deadline: null,
    target_minutes: 600,
    completed_minutes: 120,
    remaining_minutes: 480,
    progress_ratio: 0.2,
    priority_score: 80,
    suggested_session_minutes: 60,
    allocated_minutes: 0,
    ...overrides,
  });

  it('retorna peso padrão quando não há deadline', () => {
    const service = createService();
    expect(
      service['getDeadlineWeight'](null, createLocalDate(2026, 4, 9), true),
    ).toBe(0.35);
  });

  it('prioriza deadlines vencidos com peso máximo', () => {
    const service = createService();
    expect(
      service['getDeadlineWeight'](
        '2026-04-08',
        createLocalDate(2026, 4, 9),
        true,
      ),
    ).toBe(1.9);
  });

  it('converte horários em minutos', () => {
    const service = createService();
    expect(service['timeToMinutes']('09:30')).toBe(570);
  });

  it('converte minutos em horário formatado', () => {
    const service = createService();
    expect(service['minutesToTime'](570)).toBe('09:30');
  });

  it('encontra janela livre antes do primeiro bloco ocupado', () => {
    const service = createService();
    expect(
      service['findNextAvailableStart']([{ start: 600, end: 660 }], 60),
    ).toBe(480);
  });

  it('encontra janela livre entre blocos ocupados', () => {
    const service = createService();
    expect(
      service['findNextAvailableStart'](
        [
          { start: 480, end: 540 },
          { start: 630, end: 690 },
        ],
        60,
      ),
    ).toBe(540);
  });

  it('retorna null quando não há espaço suficiente no dia', () => {
    const service = createService();
    expect(
      service['findNextAvailableStart']([{ start: 480, end: 1425 }], 30),
    ).toBeNull();
  });

  it('arredonda a duração sugerida para blocos de 15 minutos', () => {
    const service = createService();
    expect(
      service['getSuggestionDuration'](
        baseSubject({ remaining_minutes: 52, suggested_session_minutes: 52 }),
        baseDayPlan(),
        240,
      ),
    ).toBe(45);
  });

  it('respeita a duração mínima da sugestão', () => {
    const service = createService();
    expect(
      service['getSuggestionDuration'](
        baseSubject({ remaining_minutes: 10, suggested_session_minutes: 10 }),
        baseDayPlan(),
        240,
      ),
    ).toBe(15);
  });

  it('monta razões com no máximo dois motivos prioritários', () => {
    const service = createService();
    expect(
      service['buildSuggestionReason'](
        baseSubject({
          difficulty_level: 5,
          deadline: '2026-04-12',
          progress_ratio: 0.1,
          remaining_minutes: 600,
        }),
        '2026-04-10',
        new Date('2026-04-09'),
      ),
    ).toBe('prazo próximo • alta dificuldade');
  });

  it('usa equilíbrio da semana quando não há razões fortes', () => {
    const service = createService();
    expect(
      service['buildSuggestionReason'](
        baseSubject({
          difficulty_level: 2,
          progress_ratio: 0.8,
          remaining_minutes: 180,
        }),
        '2026-04-10',
        new Date('2026-04-09'),
      ),
    ).toBe('equilíbrio da semana');
  });

  it('normaliza matérias, aplica fallback de cor e filtra cargas muito pequenas', () => {
    const service = createService();
    const plans = service['buildSubjectPlans'](
      [
        {
          id: 'subject-a',
          title: 'Física',
          color_code: '',
          target_hours: 10,
          completed_hours: 1,
          completed_minutes: 30,
          deadline: null,
          difficulty_level: 9,
        },
        {
          id: 'subject-b',
          title: 'Arte',
          color_code: '#000000',
          target_hours: 1,
          completed_hours: 0,
          completed_minutes: 50,
          deadline: null,
          difficulty_level: 1,
        },
      ],
      createLocalDate(2026, 4, 9),
    );

    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      id: 'subject-a',
      color_code: '#4F46E5',
      difficulty_level: 5,
      completed_minutes: 90,
      remaining_minutes: 510,
    });
  });

  it('registra eventos existentes em day plans', () => {
    const service = createService();
    const plans = service['buildDayPlans'](
      [
        {
          scheduled_date: '2026-04-10',
          scheduled_time: '09:30',
          subject_id: 'subject-1',
          duration_minutes: 45,
        },
      ],
      createLocalDate(2026, 4, 10),
      createLocalDate(2026, 4, 11),
    );

    expect(plans.get('2026-04-10')).toMatchObject({
      totalMinutes: 45,
    });
    expect(plans.get('2026-04-10')?.occupiedRanges).toEqual([
      { start: 570, end: 615 },
    ]);
  });

  it('evita sugerir matéria já presente no mesmo dia', () => {
    const service = createService();
    const dayPlan = baseDayPlan();
    dayPlan.subjectIds.add('subject-1');

    const picked = service['pickBestSubjectForDay'](
      [baseSubject(), baseSubject({ id: 'subject-2', title: 'História' })],
      dayPlan,
      createLocalDate(2026, 4, 9),
      240,
    );

    expect(picked?.id).toBe('subject-2');
  });

  it('ordena sugestões por data e horário', () => {
    const service = createService();
    const suggestions = service['buildSmartSuggestions']({
      subjects: [
        baseSubject({
          id: 'subject-1',
          title: 'Matemática',
          suggested_session_minutes: 60,
        }),
        baseSubject({
          id: 'subject-2',
          title: 'História',
          difficulty_level: 2,
          suggested_session_minutes: 45,
        }),
      ],
      existingEvents: [],
      hoursPerDay: 2,
      startDate: createLocalDate(2026, 4, 10),
      endDate: createLocalDate(2026, 4, 10),
      referenceDate: createLocalDate(2026, 4, 9),
    });

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].date).toBe('2026-04-10');
    expect(suggestions[0].suggested_time <= suggestions[1].suggested_time).toBe(
      true,
    );
  });
});
