import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { SupabaseService } from '../supabase/supabase.service';

export interface SessionWithSubject {
  id: string;
  subject_id: string | null;
  content_raw: string | null;
  ai_summary: string | null;
  duration_minutes: number | null;
  mood_rating: number | null;
  created_at: string;
  subjects: { id: string; title: string; color_code: string } | null;
}

@Injectable()
export class StudyService {
  private readonly logger = new Logger(StudyService.name);
  private openai: OpenAI | null = null;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OPENAI_API_KEY not set - AI features will use fallbacks');
    }
  }

  async createSession(userId: string, subjectId: string): Promise<SessionWithSubject> {
    const supabase = this.supabaseService.getClient();

    const { data: subject } = await supabase
      .from('subjects')
      .select('id, title, color_code')
      .eq('id', subjectId)
      .eq('student_id', userId)
      .single();

    if (!subject) {
      throw new NotFoundException('Matéria não encontrada');
    }

    const { data: session, error } = await supabase
      .from('study_sessions')
      .insert({
        student_id: userId,
        subject_id: subjectId,
        duration_minutes: 0,
      })
      .select(`
        id,
        subject_id,
        content_raw,
        ai_summary,
        duration_minutes,
        mood_rating,
        created_at,
        subjects (
          id,
          title,
          color_code
        )
      `)
      .single();

    if (error) {
      this.logger.error(`Error creating session: ${error.message}`);
      throw new Error(error.message);
    }

    return session as unknown as SessionWithSubject;
  }

  async getRecentSessions(userId: string, limit = 10): Promise<SessionWithSubject[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('study_sessions')
      .select(`
        id,
        subject_id,
        content_raw,
        ai_summary,
        duration_minutes,
        mood_rating,
        created_at,
        subjects (
          id,
          title,
          color_code
        )
      `)
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error(`Error fetching sessions: ${error.message}`);
      return [];
    }

    return (data ?? []) as unknown as SessionWithSubject[];
  }

  async getSession(userId: string, sessionId: string): Promise<SessionWithSubject> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('study_sessions')
      .select(`
        id,
        subject_id,
        content_raw,
        ai_summary,
        duration_minutes,
        mood_rating,
        created_at,
        subjects (
          id,
          title,
          color_code
        )
      `)
      .eq('id', sessionId)
      .eq('student_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Sessão não encontrada');
    }

    return data as unknown as SessionWithSubject;
  }

  async getChatIntro(sessionId: string, userId: string): Promise<string> {
    const session = await this.getSession(userId, sessionId);
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('session_chat_messages')
      .select('content')
      .eq('session_id', sessionId)
      .eq('role', 'assistant')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing?.content) return existing.content;

    const subjectTitle = session.subjects?.title ?? 'este tema';
    let intro = this.getFallbackIntro(subjectTitle);
    if (this.openai) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Você é um tutor educacional especializado. Seu papel é GUIA o estudante no aprendizado de "${subjectTitle}".

REGRAS:
1. Apresente o tema de forma motivadora e estruturada (2-4 parágrafos)
2. Explique POR QUE o tema é importante e onde se aplica
3. Sugira os primeiros passos: "Podemos começar por [conceito X]..." ou "Que tal explorarmos [tópico Y]?"
4. Convide o estudante a fazer perguntas ou pedir explicações
5. Use tom acolhedor, didático e encorajador
6. Evite markdown excessivo, seja direto`,
            },
          ],
          max_tokens: 600,
          temperature: 0.7,
        });

        const text = completion.choices[0]?.message?.content?.trim();
        if (text) intro = text;
      } catch (err) {
        this.logger.warn(`LLM intro failed: ${err?.message}`);
      }
    }

    await supabase.from('session_chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: intro,
    });

    return intro;
  }

  private getFallbackIntro(subjectTitle: string): string {
    return `Olá! Você está estudando ${subjectTitle}. Este é um tema fundamental — vou te guiar passo a passo. Podemos começar pelos conceitos básicos ou você pode me dizer o que já sabe e o que quer aprofundar. O que prefere explorar primeiro?`;
  }

  async chat(
    sessionId: string,
    userId: string,
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ): Promise<string> {
    const session = await this.getSession(userId, sessionId);
    const subjectTitle = session.subjects?.title ?? 'este tema';

    const systemPrompt = `Você é um tutor educacional especializado que GUIA o estudante a aprender "${subjectTitle}".

PAPEL:
- Seja um mentor paciente e encorajador
- Adapte suas explicações ao nível do estudante (perceba pelo contexto da conversa)
- Use exemplos práticos e analogias quando ajudar
- Faça perguntas de verificação para garantir compreensão
- Se o estudante errar ou não entender, explique de outra forma sem julgamento
- Mantenha CONTEXTO e MEMÓRIA: lembre-se do que já foi discutido e construa sobre isso
- Sugira próximos passos de estudo baseados no que falta cobrir
- Respostas claras e objetivas (2-4 parágrafos no máximo), mas complete quando necessário
- Evite markdown excessivo`;

    const recentHistory = history.slice(-20);
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...recentHistory.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: userMessage },
    ];

    if (this.openai) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 1000,
          temperature: 0.6,
        });

        const text = completion.choices[0]?.message?.content?.trim();
        const reply = text ?? 'Desculpe, não consegui gerar uma resposta. Tente novamente.';

        const supabase = this.supabaseService.getClient();
        await supabase.from('session_chat_messages').insert([
          { session_id: sessionId, role: 'user', content: userMessage },
          { session_id: sessionId, role: 'assistant', content: reply },
        ]);

        return reply;
      } catch (err) {
        this.logger.error(`Chat error: ${err?.message}`);
        return 'Ocorreu um erro ao processar sua mensagem. Tente novamente em instantes.';
      }
    }

    return 'O recurso de chat com IA está temporariamente indisponível.';
  }

  async generateQuiz(sessionId: string, userId: string, count = 5): Promise<Array<{
    question: string;
    answer: string;
    options: string[];
  }>> {
    const session = await this.getSession(userId, sessionId);
    const subjectTitle = session.subjects?.title ?? 'este tema';

    if (this.openai) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Gere exatamente ${count} questões de múltipla escolha sobre o tema "${subjectTitle}". Cada questão deve ter 4 alternativas (A, B, C, D), sendo uma correta. Retorne APENAS um JSON válido, sem texto extra, no formato: [{"question":"...","answer":"A" (ou B,C,D), "options":["opção A","opção B","opção C","opção D"]}]`,
            },
          ],
          max_tokens: 2000,
          temperature: 0.8,
        });

        const text = completion.choices[0]?.message?.content?.trim();
        const cleaned = text?.replace(/```json?|```/g, '').trim() ?? '[]';
        const parsed = JSON.parse(cleaned) as Array<{ question: string; answer: string; options: string[] }>;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const items = parsed.map((q) => ({
            question: q.question,
            answer: q.answer,
            options: Array.isArray(q.options) ? q.options : [],
          }));
          await this.saveQuizAssets(sessionId, items);
          return items;
        }
      } catch (err) {
        this.logger.warn(`Quiz generation failed: ${err?.message}`);
      }
    }

    return this.getFallbackQuiz(sessionId, subjectTitle, count);
  }

  private async saveQuizAssets(sessionId: string, items: Array<{ question: string; answer: string; options: string[] }>) {
    const batchId = randomUUID();
    const supabase = this.supabaseService.getClient();
    await supabase.from('study_assets').insert(
      items.map((q) => ({
        session_id: sessionId,
        type: 'quiz_question',
        question: q.question,
        answer: q.answer,
        options: q.options,
        batch_id: batchId,
      })),
    );
  }

  private async getFallbackQuiz(sessionId: string, subjectTitle: string, count: number) {
    const fallbacks = [
      { question: `O que é ${subjectTitle}?`, answer: 'B', options: ['Opção A', 'Conceito fundamental do tema', 'Opção C', 'Opção D'] },
      { question: 'Qual a importância deste conteúdo?', answer: 'A', options: ['Consolidar conhecimentos', 'Opção B', 'Opção C', 'Opção D'] },
    ];
    const items = fallbacks.slice(0, Math.min(count, fallbacks.length));
    await this.saveQuizAssets(sessionId, items);
    return items;
  }

  async generateFlashcards(sessionId: string, userId: string, count = 5): Promise<Array<{
    question: string;
    answer: string;
  }>> {
    const session = await this.getSession(userId, sessionId);
    const subjectTitle = session.subjects?.title ?? 'este tema';

    if (this.openai) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Gere exatamente ${count} flashcards sobre o tema "${subjectTitle}". Formato: pergunta na frente, resposta atrás. Retorne APENAS um JSON válido, sem texto extra: [{"question":"...","answer":"..."}]`,
            },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        });

        const text = completion.choices[0]?.message?.content?.trim();
        const cleaned = text?.replace(/```json?|```/g, '').trim() ?? '[]';
        const parsed = JSON.parse(cleaned) as Array<{ question: string; answer: string }>;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const items = parsed.map((f) => ({
            question: String(f.question ?? ''),
            answer: String(f.answer ?? ''),
          }));
          await this.saveFlashcardAssets(sessionId, items);
          return items;
        }
      } catch (err) {
        this.logger.warn(`Flashcard generation failed: ${err?.message}`);
      }
    }

    return this.getFallbackFlashcards(sessionId, subjectTitle, count);
  }

  private async saveFlashcardAssets(sessionId: string, items: Array<{ question: string; answer: string }>) {
    const batchId = randomUUID();
    const supabase = this.supabaseService.getClient();
    await supabase.from('study_assets').insert(
      items.map((f) => ({
        session_id: sessionId,
        type: 'flashcard',
        question: f.question,
        answer: f.answer,
        options: null,
        batch_id: batchId,
      })),
    );
  }

  private async getFallbackFlashcards(sessionId: string, subjectTitle: string, count: number) {
    const items = Array.from({ length: Math.min(count, 3) }, (_, i) => ({
      question: `Pergunta ${i + 1} sobre ${subjectTitle}`,
      answer: `Resposta ${i + 1}: conceito importante a ser revisado.`,
    }));
    await this.saveFlashcardAssets(sessionId, items);
    return items;
  }

  async getSessionAssets(userId: string, sessionId: string) {
    await this.getSession(userId, sessionId);
    const supabase = this.supabaseService.getClient();
    let { data: assets, error: assetsError } = await supabase
      .from('study_assets')
      .select('id, type, question, answer, options, batch_id')
      .eq('session_id', sessionId)

    if (assetsError) {
      this.logger.error(`getSessionAssets - error for session ${sessionId}: ${assetsError.message}`);
      // Tenta sem batch_id caso a coluna não exista (migration pendente)
      const fallback = await supabase
        .from('study_assets')
        .select('id, type, question, answer, options, created_at')
        .eq('session_id', sessionId)
      if (!fallback.error) {
        assets = (fallback.data ?? []).map((a) => ({ ...a, batch_id: null })) as typeof assets;
        assetsError = null;
        this.logger.log(`getSessionAssets - fallback query succeeded for session ${sessionId}`);
      } else {
        this.logger.error(`getSessionAssets - fallback also failed: ${fallback.error.message}`);
      }
    }
    this.logger.log(`getSessionAssets - found ${(assets ?? []).length} assets for session ${sessionId}`);

    const quizBatches = new Map<string, Array<{ id: string; question: string; answer: string; options: string[] }>>();
    const flashcardBatches = new Map<string, Array<{ id: string; question: string; answer: string }>>();

    for (const a of assets ?? []) {
      const batchId = a.batch_id ?? a.id;
      if (a.type === 'quiz_question') {
        const list = quizBatches.get(batchId) ?? [];
        list.push({
          id: a.id,
          question: a.question,
          answer: a.answer,
          options: (a.options as string[]) ?? [],
        });
        quizBatches.set(batchId, list);
      } else {
        const list = flashcardBatches.get(batchId) ?? [];
        list.push({ id: a.id, question: a.question, answer: a.answer });
        flashcardBatches.set(batchId, list);
      }
    }

    return {
      quiz_batches: Array.from(quizBatches.values()),
      flashcard_batches: Array.from(flashcardBatches.values()),
    };
  }

  async getSessionDetail(userId: string, sessionId: string) {
    const session = await this.getSession(userId, sessionId);
    const assetsData = await this.getSessionAssets(userId, sessionId);
    const supabase = this.supabaseService.getClient();

    const { data: chatMessages } = await supabase
      .from('session_chat_messages')
      .select('id, role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    return {
      ...session,
      chat_messages: chatMessages ?? [],
      ...assetsData,
    };
  }

  async getChatMessages(sessionId: string, userId: string): Promise<Array<{ role: string; content: string }>> {
    await this.getSession(userId, sessionId);
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('session_chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    return (data ?? []).map((m) => ({ role: m.role, content: m.content }));
  }

  async updateSessionDuration(userId: string, sessionId: string, durationMinutes: number) {
    await this.getSession(userId, sessionId);
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase
      .from('study_sessions')
      .update({ duration_minutes: durationMinutes })
      .eq('id', sessionId)
      .eq('student_id', userId);
    if (error) throw new Error(error.message);
  }
}
