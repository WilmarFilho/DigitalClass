import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { ChatAudioDto } from './dto/chat-message.dto';
import { SupabaseService } from '../supabase/supabase.service';

export interface SessionHighlight {
  id: string;
  session_id: string;
  text: string;
  created_at: string;
}

export interface SessionWithSubject {
  id: string;
  subject_id: string | null;
  calendar_event_id: string | null;
  content_raw: string | null;
  ai_summary: string | null;
  duration_minutes: number | null;
  mood_rating: number | null;
  created_at: string;
  subjects: { id: string; title: string; color_code: string };
  highlights?: SessionHighlight[];
}

interface QuizQuestion {
  question: string;
  answer: string;
  options: string[];
}

export interface StudyChatAudioPayload {
  content_base64: string;
  mime_type: string;
  voice: string;
}

export interface StudyChatSegment {
  id: string;
  order: number;
  text: string;
  audio?: StudyChatAudioPayload;
}

export interface StudyChatResponse {
  message: string;
  message_id: string;
  segments?: StudyChatSegment[];
  audio?: StudyChatAudioPayload;
}

@Injectable()
export class StudyService {
  private readonly logger = new Logger(StudyService.name);
  private openai: OpenAI | null = null;
  private readonly sessionExecutionChains = new Map<string, Promise<unknown>>();
  private readonly audioGenerationPromises = new Map<string, Promise<StudyChatAudioPayload>>();

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

  async createSession(userId: string, subjectId: string, calendarEventId?: string): Promise<SessionWithSubject> {
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
        calendar_event_id: calendarEventId || null,
        duration_minutes: 0,
      })
      .select(`
        id,
        subject_id,
        calendar_event_id,
        content_raw,
        ai_summary,
        duration_minutes,
        mood_rating,
        created_at,
        subjects (
          id,
          title,
          color_code,
          target_hours,
          completed_minutes
        ),
        calendar_events (
          id,
          duration_minutes
        )
      `)
      .single();

    if (error) {
      this.logger.error(`Error creating session: ${error.message}`);
      throw new Error(error.message);
    }

    return session as unknown as SessionWithSubject;
  }

  async chatSuggestedTopic(
    sessionId: string,
    userId: string,
    topic: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    includeAudio = false,
  ): Promise<StudyChatResponse> {
    return this.enqueueSessionTask(sessionId, async () => {
      const session = await this.getSession(userId, sessionId);
      const userMessage = `Gostaria de aprender sobre: ${topic}`;
      const supabase = this.supabaseService.getClient();
      let reply = 'O serviço de IA está temporariamente indisponível. Tente digitar sua dúvida manualmente.';

      if (this.openai) {
        try {
          reply = await this.buildStudyChatReply({
            session,
            sessionId,
            userMessage,
            history,
          });
        } catch (err: any) {
          this.logger.error(`Suggested topic error: ${err?.message}`);
          reply = 'Ocorreu um erro ao processar o novo tópico. Por favor, tente novamente em instantes.';
        }
      }

      const { data: inserted } = await supabase.from('session_chat_messages').insert([
        { session_id: sessionId, role: 'user', content: userMessage },
        { session_id: sessionId, role: 'assistant', content: reply },
      ]).select('id, role');

      const assistantMessageId = inserted?.find((item) => item.role === 'assistant')?.id ?? randomUUID();
      const segmentedResponse = await this.buildSegmentedChatResponse(assistantMessageId, reply, includeAudio);

      return {
        message: reply,
        message_id: assistantMessageId,
        ...segmentedResponse,
      };
    });
  }

  async getRecentSessions(userId: string, page = 1, limit = 10): Promise<any> {
    const supabase = this.supabaseService.getClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabase
      .from('study_sessions')
      .select(`
        id,
        subject_id,
        calendar_event_id,
        content_raw,
        ai_summary,
        duration_minutes,
        mood_rating,
        created_at,
        subjects (
          id,
          title,
          color_code,
          target_hours,
          completed_minutes
        ),
        calendar_events (
          id,
          duration_minutes
        )
      `, { count: 'exact' })
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      this.logger.error(`Error fetching sessions: ${error.message}`);
      return { data: [], meta: { total: 0, page, last_page: 1 } };
    }

    return {
      data: (data ?? []) as unknown as SessionWithSubject[],
      meta: {
        total: count ?? 0,
        page,
        last_page: Math.ceil((count ?? 0) / limit),
      }
    };
  }

  async getSession(userId: string, sessionId: string): Promise<SessionWithSubject> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('study_sessions')
      .select(`
        id,
        subject_id,
        calendar_event_id,
        content_raw,
        ai_summary,
        duration_minutes,
        mood_rating,
        created_at,
        subjects (
          id,
          title,
          color_code,
          target_hours,
          completed_minutes
        ),
        calendar_events (
          id,
          duration_minutes
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

  private async runStudyAgent(params: {
    label: string;
    system: string;
    user: string;
    model?: string;
    json?: boolean;
    temperature?: number;
    maxTokens?: number;
  }) {
    if (!this.openai) {
      throw new InternalServerErrorException('O serviço de IA não está configurado.');
    }

    const completion = await this.openai.chat.completions.create({
      model: params.model ?? 'gpt-4o',
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
      ...(params.json ? { response_format: { type: 'json_object' as const } } : {}),
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens ?? 1400,
    });

    const content = completion.choices[0]?.message?.content?.trim() || (params.json ? '{}' : '');

    if (!content) {
      throw new Error(`${params.label} returned empty content`);
    }

    if (params.json) {
      return this.parseJsonContent(content);
    }

    return content;
  }

  private async buildStudyChatReply(params: {
    session: SessionWithSubject;
    sessionId: string;
    userMessage: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
  }) {
    const { session, sessionId, userMessage, history } = params;
    const supabase = this.supabaseService.getClient();
    const subjectTitle = session.subjects?.title ?? 'este tema';

    const [{ data: persistedMessages }, { data: highlights }] = await Promise.all([
      supabase
        .from('session_chat_messages')
        .select('role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(24),
      supabase
        .from('study_session_highlights')
        .select('text')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const recentHistory = [
      ...(persistedMessages ?? []).reverse().map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      })),
      ...history.slice(-8),
    ]
      .slice(-28)
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');

    const highlightText = (highlights ?? []).map((item) => item.text).join('\n');
    const studyContext = `
TEMA PRINCIPAL: ${subjectTitle}
RESUMO DA SESSÃO: ${session.ai_summary ?? 'Não disponível'}
ANOTAÇÕES/CONTEÚDO BRUTO: ${session.content_raw ?? 'Não disponível'}
TRECHOS DESTACADOS PELO ALUNO:
${highlightText || 'Nenhum destaque salvo'}
HISTÓRICO RECENTE DA CONVERSA:
${recentHistory || 'Início da conversa'}
`.trim().slice(0, 16000);

    const planner = await this.runStudyAgent({
      label: 'study-chat-planner',
      json: true,
      model: 'gpt-4o-mini',
      maxTokens: 700,
      system: `Você é o AGENTE PLANEJADOR de uma sessão de estudo profunda.
Sua função é decidir como responder ao aluno de forma precisa, densa e didática.
Retorne JSON puro no formato:
{
  "student_goal":"...",
  "knowledge_gaps":["..."],
  "answer_strategy":["..."],
  "must_cover":["..."],
  "follow_up_question":"..."
}`,
      user: `Pergunta atual do aluno:
${userMessage}

Base de contexto:
${studyContext}`,
    });

    const draft = await this.runStudyAgent({
      label: 'study-chat-explainer',
      model: 'gpt-4o',
      maxTokens: 1400,
      system: `Você é o AGENTE EXPLICADOR ESPECIALISTA.
Explique com profundidade, rigor conceitual e clareza pedagógica.
Regras:
- baseie-se apenas no contexto fornecido;
- se o contexto não sustentar uma afirmação, admita a limitação;
- use exemplos ou analogias quando ajudarem;
- para temas densos, quebre em camadas sem simplificar demais;
- não invente fatos.`,
      user: `Pergunta do aluno:
${userMessage}

Plano pedagógico:
${JSON.stringify(planner)}

Base de contexto:
${studyContext}`,
    });

    const verifier = await this.runStudyAgent({
      label: 'study-chat-verifier',
      json: true,
      model: 'gpt-4o',
      maxTokens: 900,
      system: `Você é o AGENTE CÉTICO/VERIFICADOR.
Revise a resposta candidata e detecte:
- afirmações sem suporte no contexto,
- saltos lógicos,
- simplificações excessivas,
- ambiguidades,
- pontos que precisam de correção.
Retorne JSON puro no formato:
{
  "verdict":"ok|revise",
  "issues":["..."],
  "corrections":["..."],
  "missing_depth":["..."]
}`,
      user: `Pergunta do aluno:
${userMessage}

Resposta candidata:
${draft}

Base de contexto:
${studyContext}`,
    });

    const finalReply = await this.runStudyAgent({
      label: 'study-chat-finalizer',
      model: 'gpt-4o',
      maxTokens: 1200,
      system: `Você é o AGENTE TUTOR FINAL.
Monte a resposta final para o aluno.
Objetivo:
- manter profundidade e densidade quando o tema exigir;
- preservar precisão factual;
- ser didático e progressivo;
- encerrar com um próximo passo ou pergunta curta para continuar a sessão.
Regras de estilo:
- 3 a 6 parágrafos curtos;
- português claro;
- evitar markdown excessivo;
- se houver incerteza, diga explicitamente.`,
      user: `Pergunta do aluno:
${userMessage}

Plano pedagógico:
${JSON.stringify(planner)}

Rascunho especialista:
${draft}

Parecer crítico:
${JSON.stringify(verifier)}

Base de contexto:
${studyContext}`,
    });

    return finalReply.trim();
  }

  private splitReplyIntoSegments(reply: string): string[] {
    const normalized = reply.replace(/\r/g, '').trim();
    if (!normalized) return [];

    const rawParagraphs = normalized
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    const sourceParagraphs = rawParagraphs.length > 0
      ? rawParagraphs
      : normalized
        .split(/(?<=[.!?])\s+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

    const segments: string[] = [];

    for (const paragraph of sourceParagraphs) {
      if (paragraph.length <= 320) {
        segments.push(paragraph);
        continue;
      }

      const sentences = paragraph
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);

      let current = '';
      for (const sentence of sentences) {
        const candidate = current ? `${current} ${sentence}` : sentence;
        if (candidate.length <= 320) {
          current = candidate;
          continue;
        }

        if (current) {
          segments.push(current);
        }

        if (sentence.length <= 320) {
          current = sentence;
          continue;
        }

        for (let index = 0; index < sentence.length; index += 320) {
          segments.push(sentence.slice(index, index + 320).trim());
        }
        current = '';
      }

      if (current) {
        segments.push(current);
      }
    }

    return segments.filter(Boolean).slice(0, 8);
  }

  private async buildSegmentedChatResponse(
    messageId: string,
    reply: string,
    includeAudio: boolean,
  ): Promise<Pick<StudyChatResponse, 'segments' | 'audio'>> {
    const parts = this.splitReplyIntoSegments(reply);
    if (parts.length === 0) {
      return {};
    }

    const firstAudio = includeAudio ? await this.synthesizeSpeech(parts[0]) : undefined;
    const segments: StudyChatSegment[] = parts.map((text, index) => ({
      id: `${messageId}:segment:${index}`,
      order: index,
      text,
      ...(index === 0 && firstAudio ? { audio: firstAudio } : {}),
    }));

    return {
      segments,
      ...(firstAudio ? { audio: firstAudio } : {}),
    };
  }

  private async synthesizeSpeech(text: string): Promise<StudyChatAudioPayload | undefined> {
    if (!this.openai) return undefined;

    const input = text.trim().slice(0, 3500);
    if (!input) return undefined;

    try {
      const response = await this.openai.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        response_format: 'mp3',
        input,
        instructions: 'Leia no idioma predominante do texto, preservando a pronuncia correta de termos tecnicos e trechos em outras linguas. Use tom didatico, claro, natural e confiante. Se houver mistura de idiomas, alterne a pronuncia de forma natural sem traduzir o conteudo.',
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      return {
        content_base64: buffer.toString('base64'),
        mime_type: 'audio/mpeg',
        voice: 'alloy',
      };
    } catch (error: any) {
      this.logger.warn(`speech synthesis failed: ${error?.message}`);
      return undefined;
    }
  }

  private async enqueueSessionTask<T>(sessionId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.sessionExecutionChains.get(sessionId) ?? Promise.resolve();

    const current = previous
      .catch(() => undefined)
      .then(task);

    this.sessionExecutionChains.set(sessionId, current as Promise<unknown>);

    try {
      return await current;
    } finally {
      if (this.sessionExecutionChains.get(sessionId) === current) {
        this.sessionExecutionChains.delete(sessionId);
      }
    }
  }

  private async getCachedMessageAudio(messageId: string): Promise<StudyChatAudioPayload | null> {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('session_chat_message_audio_cache')
      .select('audio_base64, mime_type, voice, status')
      .eq('message_id', messageId)
      .maybeSingle();

    if (!data || data.status !== 'ready' || !data.audio_base64 || !data.mime_type || !data.voice) {
      return null;
    }

    return {
      content_base64: data.audio_base64,
      mime_type: data.mime_type,
      voice: data.voice,
    };
  }

  private async createOrLoadMessageAudio(messageId: string, content: string): Promise<StudyChatAudioPayload> {
    const cached = await this.getCachedMessageAudio(messageId);
    if (cached) return cached;

    const inFlight = this.audioGenerationPromises.get(messageId);
    if (inFlight) {
      return inFlight;
    }

    const generationPromise = (async () => {
      const supabase = this.supabaseService.getClient();

      await supabase
        .from('session_chat_message_audio_cache')
        .upsert({
          message_id: messageId,
          status: 'generating',
          updated_at: new Date().toISOString(),
          error_message: null,
        });

      try {
        const generated = await this.synthesizeSpeech(content);
        if (!generated) {
          throw new Error('Audio synthesis returned empty payload');
        }

        await supabase
          .from('session_chat_message_audio_cache')
          .upsert({
            message_id: messageId,
            status: 'ready',
            audio_base64: generated.content_base64,
            mime_type: generated.mime_type,
            voice: generated.voice,
            error_message: null,
            updated_at: new Date().toISOString(),
          });

        return generated;
      } catch (error: any) {
        await supabase
          .from('session_chat_message_audio_cache')
          .upsert({
            message_id: messageId,
            status: 'failed',
            error_message: error?.message ?? 'unknown audio generation error',
            updated_at: new Date().toISOString(),
          });
        throw error;
      }
    })();

    this.audioGenerationPromises.set(messageId, generationPromise);

    try {
      return await generationPromise;
    } finally {
      this.audioGenerationPromises.delete(messageId);
    }
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

  async chat(
    sessionId: string,
    userId: string,
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    includeAudio = false,
  ): Promise<StudyChatResponse> {
    return this.enqueueSessionTask(sessionId, async () => {
      const session = await this.getSession(userId, sessionId);
      const supabase = this.supabaseService.getClient();

      if (!this.openai) {
        return {
          message: 'O recurso de chat com IA está temporariamente indisponível.',
          message_id: randomUUID(),
        };
      }

      try {
        const reply = await this.buildStudyChatReply({
          session,
          sessionId,
          userMessage,
          history,
        });

        const { data: inserted } = await supabase.from('session_chat_messages').insert([
          { session_id: sessionId, role: 'user', content: userMessage },
          { session_id: sessionId, role: 'assistant', content: reply },
        ]).select('id, role');

        const assistantMessageId = inserted?.find((item) => item.role === 'assistant')?.id ?? randomUUID();
        const segmentedResponse = await this.buildSegmentedChatResponse(assistantMessageId, reply, includeAudio);

        return {
          message: reply,
          message_id: assistantMessageId,
          ...segmentedResponse,
        };
      } catch (err: any) {
        this.logger.error(`Chat error: ${err?.message}`);
        return {
          message: 'Ocorreu um erro ao processar sua mensagem. Tente novamente em instantes.',
          message_id: randomUUID(),
        };
      }
    });
  }

  async getNextSteps(subjectTitle: string, history: any[]): Promise<string[]> {
    if (!this.openai) return [];

    const lastMessages = history.slice(-5).map(h => `${h.role}: ${h.content}`).join('\n');

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um coordenador pedagógico. Com base no tema "${subjectTitle}" e na conversa atual, sugira EXATAMENTE 2 tópicos curtos (máximo 3 palavras cada) que seriam o próximo passo lógico de estudo. Retorne apenas os tópicos separados por vírgula, sem numeração.`
          },
          { role: 'user', content: `Histórico da conversa:\n${lastMessages}` }
        ],
        temperature: 0.5,
      });

      const res = completion.choices[0]?.message?.content;
      return res ? res.split(',').map(s => s.trim().replace('.', '')) : [];
    } catch (err) {
      return [];
    }
  }

  async generateLessonQuiz(lessonId: string, count = 5): Promise<any[]> {
    const supabase = this.supabaseService.getClient();

    // 1. Buscar o conteúdo bruto da aula (Texto do PDF + Transcrição)
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('title, content_text, transcription, area_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      throw new NotFoundException('Aula não encontrada para gerar o quiz.');
    }

    // 2. Consolidar o material didático
    const lessonContext = `
    TÍTULO DA AULA: ${lesson.title}
    CONTEÚDO EXTRAÍDO: ${lesson.content_text || ''}
    TRANSCRIÇÃO DO VÍDEO: ${lesson.transcription || ''}
  `.trim();

    if (lessonContext.length < 100) {
      throw new BadRequestException('Conteúdo insuficiente na aula para gerar um quiz de qualidade.');
    }

    if (!this.openai) {
      throw new InternalServerErrorException('O serviço de IA não está configurado.');
    }

    try {
      return await this.buildReviewedQuiz({
        title: lesson.title,
        knowledgeBase: lessonContext,
        count,
      });
    } catch (err) {
      this.logger.error(`Erro na geração de quiz da aula ${lessonId}: ${err?.message}`);
      throw new InternalServerErrorException('Não foi possível gerar o quiz no momento.');
    }
  }

  private getFallbackIntro(subjectTitle: string): string {
    return `Olá! Você está estudando ${subjectTitle}. Este é um tema fundamental — vou te guiar passo a passo. Podemos começar pelos conceitos básicos ou você pode me dizer o que já sabe e o que quer aprofundar. O que prefere explorar primeiro?`;
  }

  private parseJsonContent(raw: string | null | undefined) {
    const text = raw?.trim() || '{}';
    const cleaned = text.replace(/```json?|```/g, '').trim();
    return JSON.parse(cleaned);
  }

  private normalizeQuizQuestion(raw: any): QuizQuestion | null {
    if (!raw || typeof raw !== 'object') return null;

    const question = String(raw.question ?? '').trim();
    const rawOptions = Array.isArray(raw.options) ? raw.options : [];
    const options = rawOptions
      .map((option) => String(option ?? '').trim())
      .filter(Boolean)
      .slice(0, 4);

    let answer = String(raw.answer ?? '').trim().toUpperCase();
    const validLetters = ['A', 'B', 'C', 'D'];

    if (!validLetters.includes(answer) && answer) {
      const answerIndex = options.findIndex((option) => option.toLowerCase() === answer.toLowerCase());
      if (answerIndex >= 0) {
        answer = validLetters[answerIndex];
      }
    }

    if (!question || options.length !== 4 || !validLetters.includes(answer)) {
      return null;
    }

    const uniqueOptions = new Set(options.map((option) => option.toLowerCase()));
    if (uniqueOptions.size !== 4) {
      return null;
    }

    return { question, options, answer };
  }

  private sanitizeQuizQuestions(items: any[], count: number, previousQuestions: string[] = []): QuizQuestion[] {
    const sanitized: QuizQuestion[] = [];
    const seen = new Set(previousQuestions.map((question) => question.trim().toLowerCase()).filter(Boolean));

    for (const item of items) {
      const normalized = this.normalizeQuizQuestion(item);
      if (!normalized) continue;

      const signature = normalized.question.trim().toLowerCase();
      if (seen.has(signature)) continue;

      seen.add(signature);
      sanitized.push(normalized);

      if (sanitized.length >= count) break;
    }

    return sanitized;
  }

  private async runQuizAgent(system: string, user: string, label: string) {
    if (!this.openai) {
      throw new InternalServerErrorException('O serviço de IA não está configurado.');
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });

      return this.parseJsonContent(completion.choices[0]?.message?.content);
    } catch (error: any) {
      this.logger.error(`${label} failed: ${error?.message}`);
      throw error;
    }
  }

  private async buildReviewedQuiz(params: {
    title: string;
    knowledgeBase: string;
    count: number;
    previousQuestions?: string[];
  }): Promise<QuizQuestion[]> {
    const { title, knowledgeBase, count, previousQuestions = [] } = params;
    const limitedKnowledgeBase = knowledgeBase.slice(0, 14000);
    const previousQuestionsText = previousQuestions.length ? previousQuestions.join(' | ') : 'Nenhuma';

    const generator = await this.runQuizAgent(
      `Você é o AGENTE GERADOR de quizzes.
Sua missão é criar um quiz de múltipla escolha usando apenas a base de conhecimento recebida.
Regras:
1. Gere exatamente ${count} questões inéditas.
2. Cada questão precisa ter 4 alternativas não vazias.
3. Apenas uma alternativa pode ser correta.
4. "answer" deve ser apenas "A", "B", "C" ou "D".
5. Nunca repita perguntas anteriores.
Retorne JSON puro no formato {"questions":[{"question":"...","options":["...","...","...","..."],"answer":"A"}]}.`,
      `Tema: ${title}

Perguntas anteriores que não podem ser repetidas:
${previousQuestionsText}

Base de conhecimento:
${limitedKnowledgeBase}`,
      'Quiz generator',
    );

    const generatedQuestions = this.sanitizeQuizQuestions(
      Array.isArray(generator?.questions) ? generator.questions : [],
      count,
      previousQuestions,
    );

    if (generatedQuestions.length === 0) {
      throw new Error('Quiz generator returned no valid questions');
    }

    const factualReview = await this.runQuizAgent(
      `Você é o AGENTE VERIFICADOR FÁTICO.
Analise cada questão e confirme se a resposta marcada está correta com base apenas na base de conhecimento.
Se encontrar erro, corrija a alternativa correta.
Retorne JSON puro no formato {"reviews":[{"question":"...","verdict":"ok|fix","correct_answer":"A","notes":"..."}]}.`,
      `Tema: ${title}

Base de conhecimento:
${limitedKnowledgeBase}

Quiz candidato:
${JSON.stringify(generatedQuestions)}`,
      'Quiz factual reviewer',
    );

    const qualityReview = await this.runQuizAgent(
      `Você é o AGENTE REVISOR DE QUALIDADE.
Revise o quiz para detectar:
- alternativas vazias
- alternativas duplicadas
- perguntas duplicadas
- ambiguidades
- linguagem confusa
Quando necessário, reescreva a questão inteira mantendo fidelidade ao conteúdo.
Retorne JSON puro no formato {"questions":[{"question":"...","options":["...","...","...","..."],"answer":"A"}],"issues":["..."]}.`,
      `Tema: ${title}

Perguntas anteriores que não podem ser repetidas:
${previousQuestionsText}

Base de conhecimento:
${limitedKnowledgeBase}

Quiz candidato:
${JSON.stringify(generatedQuestions)}

Parecer factual:
${JSON.stringify(factualReview)}`,
      'Quiz quality reviewer',
    );

    const consolidated = await this.runQuizAgent(
      `Você é o AGENTE CONSOLIDADOR FINAL.
Você recebe um quiz candidato e dois pareceres de revisão.
Sua tarefa é devolver a versão final, corrigida e consistente.
Regras finais:
1. Gere exatamente ${count} questões.
2. Não repita perguntas anteriores.
3. Todas as alternativas precisam ser preenchidas.
4. Apenas uma correta por questão.
5. "answer" deve ser apenas "A", "B", "C" ou "D".
6. A resposta precisa apontar para uma alternativa existente e correta.
Retorne JSON puro no formato {"questions":[{"question":"...","options":["...","...","...","..."],"answer":"A"}]}.`,
      `Tema: ${title}

Perguntas anteriores que não podem ser repetidas:
${previousQuestionsText}

Base de conhecimento:
${limitedKnowledgeBase}

Quiz candidato:
${JSON.stringify(generatedQuestions)}

Parecer factual:
${JSON.stringify(factualReview)}

Parecer de qualidade:
${JSON.stringify(qualityReview)}`,
      'Quiz consolidator',
    );

    const consolidatedQuestions = this.sanitizeQuizQuestions(
      Array.isArray(consolidated?.questions) ? consolidated.questions : [],
      count,
      previousQuestions,
    );

    if (consolidatedQuestions.length >= count) {
      return consolidatedQuestions.slice(0, count);
    }

    const repair = await this.runQuizAgent(
      `Você é o AGENTE REPARADOR.
Complete o quiz mantendo o que já está válido e gerando apenas o que falta.
Regras:
1. Complete até totalizar ${count} questões válidas.
2. Nunca repita perguntas já aprovadas nem perguntas anteriores.
3. Cada questão deve ter 4 alternativas não vazias.
4. "answer" deve ser apenas "A", "B", "C" ou "D".
Retorne JSON puro no formato {"questions":[...]} com a lista completa final.`,
      `Tema: ${title}

Perguntas anteriores que não podem ser repetidas:
${previousQuestionsText}

Base de conhecimento:
${limitedKnowledgeBase}

Questões já aprovadas:
${JSON.stringify(consolidatedQuestions)}`,
      'Quiz repair agent',
    );

    const repairedQuestions = this.sanitizeQuizQuestions(
      Array.isArray(repair?.questions) ? repair.questions : [],
      count,
      [...previousQuestions, ...consolidatedQuestions.map((item) => item.question)],
    );

    const mergedQuestions = this.sanitizeQuizQuestions(
      [...consolidatedQuestions, ...repairedQuestions],
      count,
      previousQuestions,
    );

    if (mergedQuestions.length === 0) {
      throw new Error('Reviewed quiz pipeline returned no valid questions');
    }

    return mergedQuestions.slice(0, count);
  }

  async generateQuiz(sessionId: string, userId: string, count = 5): Promise<Array<{
    question: string;
    answer: string;
    options: string[];
  }>> {
    const session = await this.getSession(userId, sessionId);
    const subjectTitle = session.subjects?.title ?? 'este tema';
    const supabase = this.supabaseService.getClient();

    // 1. Buscar contexto do Chat para saber o que foi ensinado
    const { data: chatMessages } = await supabase
      .from('session_chat_messages')
      .select('content, role')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(10);

    // 2. Buscar Quizzes anteriores para evitar repetição
    // Assumindo que você salva os quizzes em uma tabela 'session_quiz_questions'
    const { data: existingQuizzes } = await supabase
      .from('study_assets')
      .select('question')
      .eq('session_id', sessionId)
      .eq('type', 'quiz_question');

    const previousQuestionsList = (existingQuizzes ?? [])
      .map((q) => String(q.question ?? '').trim())
      .filter(Boolean);
    const contextSummary = chatMessages?.reverse().map(m => `${m.role}: ${m.content}`).join('\n') || 'Início do estudo.';

    if (this.openai) {
      try {
        const items = await this.buildReviewedQuiz({
          title: subjectTitle,
          knowledgeBase: contextSummary,
          count,
          previousQuestions: previousQuestionsList,
        });

        await this.saveQuizAssets(sessionId, items);
        return items;
      } catch (err) {
        this.logger.error(`Erro na geração de quiz: ${err?.message}`);
      }
    }

    return this.getFallbackQuiz(sessionId, subjectTitle, count);
  }

  private async saveQuizAssets(sessionId: string, items: Array<{ question: string; answer: string; options: string[] }>) {
    const batchId = randomUUID();
    const supabase = this.supabaseService.getClient();
    const sanitizedItems = this.sanitizeQuizQuestions(items, items.length);
    if (!sanitizedItems.length) return;

    await supabase.from('study_assets').insert(
      sanitizedItems.map((q) => ({
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
    const fallbacks: QuizQuestion[] = [
      {
        question: `Qual alternativa melhor descreve o conceito central de ${subjectTitle}?`,
        answer: 'B',
        options: [
          'Um detalhe secundário do conteúdo',
          `A ideia principal que organiza o estudo de ${subjectTitle}`,
          'Uma curiosidade sem relação com o tema',
          'Um exercício prático sem teoria',
        ],
      },
      {
        question: `Por que revisar ${subjectTitle} com perguntas de fixação ajuda no aprendizado?`,
        answer: 'A',
        options: [
          'Porque reforça a lembrança ativa e destaca lacunas de entendimento',
          'Porque elimina a necessidade de estudar o conteúdo',
          'Porque transforma qualquer resposta em correta',
          'Porque substitui completamente as anotações',
        ],
      },
      {
        question: `Ao responder um quiz sobre ${subjectTitle}, o que mais importa?`,
        answer: 'C',
        options: [
          'Memorizar qualquer alternativa',
          'Escolher a resposta mais longa',
          'Relacionar a pergunta ao conteúdo realmente estudado',
          'Marcar sempre a letra A primeiro',
        ],
      },
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
    const supabase = this.supabaseService.getClient();

    // 1. Buscar contexto do Chat para saber o que foi discutido
    const { data: chatMessages } = await supabase
      .from('session_chat_messages')
      .select('content, role')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(10);

    // 2. Buscar Flashcards anteriores para evitar repetição
    const { data: existingFlashcards } = await supabase
      .from('study_assets')
      .select('question')
      .eq('session_id', sessionId)
      .eq('type', 'flashcard'); // Ajuste o 'type' conforme seu banco

    const previousFlashcards = existingFlashcards?.map(f => f.question).join('|') || 'Nenhum';
    const contextSummary = chatMessages?.reverse().map(m => `${m.role}: ${m.content}`).join('\n') || 'Início do estudo.';

    if (this.openai) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o', // Upgrade para o modelo mais inteligente
          messages: [
            {
              role: 'system',
              content: `Você é um tutor pedagógico especializado em "${subjectTitle}". Sua tarefa é criar flashcards (pergunta e resposta rápida) para memorização.

            CONTEXTO DO QUE FOI DISCUTIDO NO CHAT:
            ${contextSummary}

            FLASHCARDS JÁ GERADOS (NÃO REPITA ESTAS PERGUNTAS OU TEMAS):
            ${previousFlashcards}

            REGRAS CRÍTICAS:
            1. Gere exatamente ${count} flashcards inéditos.
            2. Foque em conceitos-chave, definições ou fórmulas discutidas no chat.
            3. As perguntas devem ser diretas e as respostas concisas.
            4. Retorne APENAS um JSON puro no formato: {"flashcards": [{"question":"...","answer":"..."}]}`
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.8,
        });

        const text = completion.choices[0]?.message?.content?.trim() || '{}';
        const parsedData = JSON.parse(text);

        // Suporta tanto o array direto quanto o objeto encapsulado
        const flashcardsArray = Array.isArray(parsedData) ? parsedData : parsedData.flashcards;

        if (Array.isArray(flashcardsArray)) {
          const items = flashcardsArray.map((f) => ({
            question: String(f.question ?? ''),
            answer: String(f.answer ?? ''),
          }));

          await this.saveFlashcardAssets(sessionId, items);
          return items;
        }
      } catch (err) {
        this.logger.error(`Flashcard generation failed: ${err?.message}`);
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

    const { data: highlights } = await supabase
      .from('study_session_highlights')
      .select('id, session_id, text, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    return {
      ...session,
      chat_messages: chatMessages ?? [],
      highlights: highlights ?? [],
      ...assetsData,
    };
  }

  async getChatMessages(sessionId: string, userId: string): Promise<Array<{ role: string; content: string }>> {
    await this.getSession(userId, sessionId);
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('session_chat_messages')
      .select('id, role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    return (data ?? []).map((m) => ({ id: m.id, role: m.role, content: m.content, created_at: m.created_at })) as any;
  }

  async generateChatAudio(sessionId: string, userId: string, dto: ChatAudioDto) {
    await this.getSession(userId, sessionId);
    const supabase = this.supabaseService.getClient();

    let content = dto.content?.trim() ?? '';
    let targetMessageId = dto.message_id ?? null;

    if (dto.message_id) {
      const { data: message } = await supabase
        .from('session_chat_messages')
        .select('id, content, role')
        .eq('id', dto.message_id)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (!message || message.role !== 'assistant') {
        throw new NotFoundException('Mensagem da IA não encontrada para gerar áudio.');
      }

      content = message.content;
    }

    if (!content) {
      throw new BadRequestException('Nenhum conteúdo foi informado para gerar o áudio.');
    }

    if (targetMessageId) {
      const audio = await this.createOrLoadMessageAudio(targetMessageId, content);
      return audio;
    }

    const audio = await this.synthesizeSpeech(content);
    if (!audio) {
      throw new InternalServerErrorException('Não foi possível gerar o áudio no momento.');
    }

    return audio;
  }

  async updateSessionDuration(userId: string, sessionId: string, durationMinutes: number, isFinished = false) {
    const session = await this.getSession(userId, sessionId);
    const supabase = this.supabaseService.getClient();

    // Update the session duration
    const { error: sessionError } = await supabase
      .from('study_sessions')
      .update({ duration_minutes: durationMinutes })
      .eq('id', sessionId)
      .eq('student_id', userId);

    if (sessionError) throw new Error(sessionError.message);

    // Update the subject's completed_minutes
    if (session.subject_id && durationMinutes > 0) {
      const { error: subjectError } = await supabase.rpc('increment_subject_minutes', {
        sub_id: session.subject_id,
        minutes: durationMinutes
      });

      if (subjectError) {
        // Fallback if RPC doesn't exist yet
        this.logger.warn(`RPC increment_subject_minutes failed, trying manual update: ${subjectError.message}`);
        const { data: subjectData } = await supabase
          .from('subjects')
          .select('completed_minutes')
          .eq('id', session.subject_id)
          .single();

        if (subjectData) {
          await supabase
            .from('subjects')
            .update({ completed_minutes: (subjectData.completed_minutes || 0) + durationMinutes })
            .eq('id', session.subject_id);
        }
      }
    }

    // Finish calendar event if requested
    if (isFinished && session.calendar_event_id) {
      try {
        await supabase
          .from('calendar_events')
          .delete()
          .eq('id', session.calendar_event_id);
      } catch (err) {
        this.logger.warn(`Failed to delete calendar event: ${err.message}`);
      }
    }
  }

  async saveHighlight(userId: string, sessionId: string, text: string): Promise<SessionHighlight> {
    await this.getSession(userId, sessionId); // check if session exists and belongs to user
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('study_session_highlights')
      .insert({
        session_id: sessionId,
        text,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error saving highlight for session ${sessionId}: ${error.message}`);
      throw new Error(error.message);
    }

    return data;
  }
}
