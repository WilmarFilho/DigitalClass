import { ConfigService } from '@nestjs/config';
import { ProfileService } from '../profile/profile.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SubjectsService } from './subjects.service';

describe('SubjectsService', () => {
  const createService = (profile: Record<string, unknown> | null = null) => {
    const getClient = jest.fn();
    const getProfile = jest.fn().mockResolvedValue(profile);
    const getConfig = jest.fn().mockReturnValue(undefined);

    const supabaseService = {
      getClient,
    } as unknown as SupabaseService;

    const profileService = {
      getProfile,
    } as unknown as ProfileService;

    const configService = {
      get: getConfig,
    } as unknown as ConfigService;

    return {
      getClient,
      getProfile,
      supabaseService,
      profileService,
      configService,
      service: new SubjectsService(
        supabaseService,
        profileService,
        configService,
      ),
    };
  };

  it('retorna fallback quando o perfil não tem objetivos nem interesses', async () => {
    const { service, getProfile } = createService({
      learning_goals: [],
      interests: [],
      hours_per_day: 2,
    });

    const result = await service.getRecommendations('student-fallback');

    expect(getProfile).toHaveBeenCalledWith('student-fallback');
    expect(result).toHaveLength(6);
    expect(result[0]).toMatchObject({
      title: 'Matemática',
      suggested_hours: 80,
      difficulty_level: 4,
    });
  });

  it('retorna fallback quando não há chave da OpenAI, mesmo com perfil preenchido', async () => {
    const { service } = createService({
      learning_goals: ['Vestibular'],
      interests: ['Biologia'],
      hours_per_day: 3,
    });

    const result = await service.getRecommendations('student-no-openai');

    expect(result.some((subject) => subject.title === 'Biologia')).toBe(true);
    expect(result.every((subject) => subject.suggested_hours >= 10)).toBe(true);
  });

  it('calcula a paginação corretamente ao listar matérias', async () => {
    const range = jest.fn().mockResolvedValue({
      data: [{ id: 'subject-1', title: 'Matemática' }],
      count: 7,
      error: null,
    });

    const order = jest.fn().mockReturnValue({ range });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });

    const { service, getClient } = createService();
    getClient.mockReturnValue({ from });

    const result = await service.getMySubjects('student-page', 2, 3);

    expect(from).toHaveBeenCalledWith('subjects');
    expect(range).toHaveBeenCalledWith(3, 5);
    expect(result).toEqual({
      data: [{ id: 'subject-1', title: 'Matemática' }],
      meta: {
        total: 7,
        page: 2,
        last_page: 3,
      },
    });
  });
});
