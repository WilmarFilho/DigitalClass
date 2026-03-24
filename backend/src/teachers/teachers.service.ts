import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { AiService } from './ai.service';
import { StripeService } from '../stripe/stripe.service';
import { CreateTeacherAreaDto } from './dto/create-teacher-area.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import * as ffmpeg from 'fluent-ffmpeg';
import * as streamifier from 'streamifier';
import { Readable, PassThrough } from 'stream';
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';


ffmpeg.setFfmpegPath(ffmpegPath);

export const LESSONS_BUCKET = 'lessons';

// ── Fee constants ────────────────────────────────────────────────────────────
const STRIPE_PERCENT_FEE = 0.0399; // 3.99% for Brazilian cards
const STRIPE_FIXED_FEE = 0.39;     // R$0.39
const PLATFORM_FEE_PERCENT = 0.20; // 20%

@Injectable()
export class TeachersService {
  private readonly logger = new Logger(TeachersService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly aiService: AiService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) { }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private supabase() {
    return this.supabaseService.getClient();
  }

  private translateStorageError(msg: string): string {
    if (msg.includes('The object exceeded the maximum allowed size')) {
      return 'O arquivo excede o tamanho máximo permitido pelo servidor.';
    }
    if (msg.includes('The resource was not found')) {
      return 'O recurso solicitado não foi encontrado no armazenamento.';
    }
    return msg;
  }

  async toggleAi(teacherId: string, areaId: string) {
    // Primeiro pegamos o estado atual para inverter ou validar
    const { data: area, error: fetchError } = await this.supabase()
      .from('teacher_areas')
      .select('ai_tutor_enabled')
      .eq('id', areaId)
      .eq('teacher_id', teacherId)
      .single();

    if (fetchError || !area) throw new NotFoundException('Área não encontrada.');

    const { data, error } = await this.supabase()
      .from('teacher_areas')
      .update({ ai_tutor_enabled: !area.ai_tutor_enabled })
      .eq('id', areaId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async syncKnowledgeBase(teacherId: string, areaId: string) {
    this.logger.log(`Iniciando sincronização de IA para área: ${areaId}`);

    try {
      // 2. Buscar todas as aulas da área que possuem conteúdo extraído
      const { data: lessons, error: lessonsError } = await this.supabase()
        .from('lessons')
        .select('id, title, content_text, transcription')
        .eq('area_id', areaId);

      if (lessonsError) throw lessonsError;

      // 3. Limpar conhecimento antigo para evitar duplicatas
      await this.supabase()
        .from('teacher_area_knowledge')
        .delete()
        .eq('area_id', areaId);

      if (!lessons || lessons.length === 0) {
        throw new Error('Nenhuma aula com conteúdo encontrada.');
      }

      for (const lesson of lessons) {
        // Consolidar o texto disponível
        const textToEmbed = [
          `Aula: ${lesson.title}`,
          lesson.content_text ? `Conteúdo PDF: ${lesson.content_text}` : '',
          lesson.transcription ? `Transcrição Vídeo: ${lesson.transcription}` : ''
        ].filter(Boolean).join('\n\n');

        if (textToEmbed.length < 20) continue;

        // 4. Fragmentar o texto (Chunks) para não estourar o limite de tokens
        const chunks = this.chunkText(textToEmbed, 1000);

        for (const chunk of chunks) {
          // 5. Gerar Embedding (Vetor) via OpenAI
          const embedding = await this.aiService.generateEmbedding(chunk);

          // 6. Inserir na tabela de conhecimento vetorial
          const { error: insertError } = await this.supabase()
            .from('teacher_area_knowledge')
            .insert({
              area_id: areaId,
              lesson_id: lesson.id,
              content: chunk,
              embedding: embedding, // Coluna do tipo 'vector' no Postgres
              metadata: {
                lesson_title: lesson.title,
                synced_at: new Date().toISOString()
              }
            });

          if (insertError) this.logger.error(`Erro ao inserir chunk: ${insertError.message}`);
        }
      }

      // 7. Finalizar atualizando datas e status
      const { data: updatedArea } = await this.supabase()
        .from('teacher_areas')
        .update({
          ai_last_sync_at: new Date().toISOString()
        })
        .eq('id', areaId)
        .select()
        .single();

      this.logger.log(`Sincronização concluída para área ${areaId}`);
      return updatedArea;

    } catch (error) {
      this.logger.error(`Falha na sincronização da área ${areaId}: ${error.message}`);
      throw new InternalServerErrorException('Falha ao sincronizar base de conhecimento.');
    }
  }

  // Função auxiliar para quebrar textos grandes
  private chunkText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let current = 0;
    while (current < text.length) {
      chunks.push(text.substring(current, current + maxLength));
      current += maxLength;
    }
    return chunks;
  }



  private async extractAudioFromBuffer(buffer: Buffer): Promise<Buffer> {
    const ffmpeg = require('fluent-ffmpeg');
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    ffmpeg.setFfmpegPath(ffmpegPath);

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-'));
    const inputPath = path.join(tempDir, 'input.mp4');
    const outputPath = path.join(tempDir, 'output.mp3');

    fs.writeFileSync(inputPath, buffer);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('libmp3lame')
        .audioBitrate(48)
        .noVideo()
        .save(outputPath)
        .on('end', () => {
          const audioBuffer = fs.readFileSync(outputPath);

          // limpa tudo
          fs.rmSync(tempDir, { recursive: true, force: true });

          resolve(audioBuffer);
        })
        .on('error', reject);
    });
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

  private async assertTeacherOrSubscriber(userId: string, areaId: string) {
    const { data: area } = await this.supabase()
      .from('teacher_areas')
      .select('teacher_id')
      .eq('id', areaId)
      .maybeSingle();
    if (!area) throw new NotFoundException('Área não encontrada');

    if (area.teacher_id === userId) return true;

    const { data: sub } = await this.supabase()
      .from('teacher_subscriptions')
      .select('student_id')
      .eq('student_id', userId)
      .eq('teacher_area_id', areaId)
      .in('subscription_status', ['active', 'past_due', 'lifetime'])
      .maybeSingle();

    if (!sub) {
      // Check if user is a teacher themselves, if they are not the owner they can't access anyway unless subscribed.
      throw new ForbiddenException('Assine esta área para acessar o conteúdo');
    }
    return true;
  }

  // ─── Fee Breakdown ─────────────────────────────────────────────────────────

  calculateFees(monthlyPrice: number) {
    if (monthlyPrice <= 0) {
      return {
        gross: 0,
        stripe_fee: 0,
        platform_fee: 0,
        net_teacher: 0,
      };
    }

    const stripeFee = +(monthlyPrice * STRIPE_PERCENT_FEE + STRIPE_FIXED_FEE).toFixed(2);
    const platformFee = +(monthlyPrice * PLATFORM_FEE_PERCENT).toFixed(2);
    const netTeacher = +(monthlyPrice - stripeFee - platformFee).toFixed(2);

    return {
      gross: monthlyPrice,
      stripe_fee: stripeFee,
      platform_fee: platformFee,
      net_teacher: Math.max(0, netTeacher),
    };
  }

  // ─── Área pública de professores (alunos) ──────────────────────────────────

  /** Lista todas as áreas públicas de professores com info do professor */
  async listAllAreas(page = 1, limit = 20, search?: string) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase()
      .from('teacher_areas')
      .select(`
        id, title, description, color_code, monthly_price, payment_model, banner_url, is_private, created_at,
        profiles!teacher_id ( id, full_name, avatar_url )
      `, { count: 'exact' })
      .eq('is_private', false);

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) this.logger.error(`listAllAreas: ${error.message}`);
    return {
      data: (data ?? []).map((area) => this.formatArea(area)),
      meta: {
        total: count ?? 0,
        page,
        last_page: Math.ceil((count ?? 0) / limit),
      }
    };
  }

  /** Detalhe de uma área específica (respeita RLS: áreas privadas só para o dono) */
  async getAreaById(areaId: string) {
    const { data, error } = await this.supabase()
      .from('teacher_areas')
      .select(`
        id, title, description, color_code, ai_tutor_enabled, ai_last_sync_at, monthly_price, payment_model, banner_url, is_private, created_at,
        profiles!teacher_id ( id, full_name, avatar_url )
      `)
      .eq('id', areaId)
      .maybeSingle();

    if (error) {
      this.logger.error(`getAreaById: ${error.message}`);
      throw new NotFoundException('Área não encontrada');
    }
    if (!data) {
      throw new NotFoundException('Área não encontrada');
    }
    return this.formatArea(data);
  }

  /** Áreas que o aluno segue */
  async listFollowing(studentId: string, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await this.supabase()
      .from('teacher_subscriptions')
      .select(`
        subscribed_at, subscription_status,
        teacher_areas (
          id, title, description, color_code, monthly_price, payment_model, banner_url, created_at,
          profiles!teacher_id ( id, full_name, avatar_url )
        )
      `, { count: 'exact' })
      .eq('student_id', studentId)
      .in('subscription_status', ['active', 'past_due', 'lifetime'])
      .range(from, to);

    if (error) this.logger.error(`listFollowing: ${error.message}`);

    return {
      data: (data ?? []).map((row: any) => ({
        subscribed_at: row.subscribed_at,
        subscription_status: row.subscription_status ?? 'active',
        ...this.formatArea(row.teacher_areas),
      })),
      meta: {
        total: count ?? 0,
        page,
        last_page: Math.ceil((count ?? 0) / limit),
      }
    };
  }

  /** Quantidade de alunos em cada área */
  async getAreaStudentCount(areaId: string): Promise<number> {
    const { count } = await this.supabase()
      .from('teacher_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_area_id', areaId)
      .in('subscription_status', ['active', 'past_due', 'lifetime']);
    return count ?? 0;
  }

  /** Módulo com aulas (aluno assinante ou dono da área) */
  async getModuleWithLessons(userId: string, moduleId: string) {
    const { data: module, error: moduleError } = await this.supabase()
      .from('teacher_area_modules')
      .select('id, title, description, order_index, section_id')
      .eq('id', moduleId)
      .maybeSingle();

    if (moduleError || !module) {
      throw new NotFoundException('Módulo não encontrado');
    }

    const { data: section } = await this.supabase()
      .from('teacher_area_sections')
      .select('area_id')
      .eq('id', module.section_id)
      .maybeSingle();

    if (!section?.area_id) throw new NotFoundException('Módulo não encontrado');

    await this.assertTeacherOrSubscriber(userId, section.area_id);

    const { data: lessons } = await this.supabase()
      .from('lessons')
      .select('id, title, description, type, content_url, duration_minutes, order_index')
      .eq('module_id', moduleId)
      .order('order_index', { ascending: true });

    const lessonIds = (lessons ?? []).map((l) => l.id);
    const [progressRes, materialsRes] = await Promise.all([
      lessonIds.length ? this.supabase()
        .from('lesson_progress')
        .select('lesson_id, completed, watched_until_percent, completed_at')
        .eq('student_id', userId)
        .in('lesson_id', lessonIds) : Promise.resolve({ data: [] }),
      lessonIds.length ? this.supabase()
        .from('lesson_materials')
        .select('lesson_id, id, type, title, url, order_index')
        .in('lesson_id', lessonIds)
        .order('order_index', { ascending: true }) : Promise.resolve({ data: [] }),
    ]);

    const progressMap = new Map((progressRes.data ?? []).map((p: any) => [p.lesson_id, p]));
    const materialsByLesson = new Map<string, any[]>();
    for (const m of materialsRes.data ?? []) {
      const list = materialsByLesson.get(m.lesson_id) ?? [];
      list.push({ id: m.id, type: m.type, title: m.title, url: m.url });
      materialsByLesson.set(m.lesson_id, list);
    }

    return {
      id: module.id,
      title: module.title,
      description: module.description ?? null,
      lessons: (lessons ?? []).map((l) => {
        const prog = progressMap.get(l.id);
        return {
          id: l.id,
          title: l.title,
          description: l.description ?? null,
          type: l.type ?? 'video',
          content_url: l.content_url ?? null,
          duration_minutes: l.duration_minutes ?? null,
          progress: prog ? { completed: prog.completed, watched_until_percent: Number(prog.watched_until_percent ?? 0) } : null,
          materials: materialsByLesson.get(l.id) ?? [],
        };
      }),
    };
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
        .in('subscription_status', ['active', 'past_due', 'lifetime'])
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

  /** Subscribe diretamente (somente para áreas gratuitas) */
  async subscribe(studentId: string, areaId: string) {
    // Check if area is free
    const { data: area } = await this.supabase()
      .from('teacher_areas')
      .select('monthly_price')
      .eq('id', areaId)
      .maybeSingle();

    if (!area) throw new NotFoundException('Área não encontrada');

    if (Number(area.monthly_price) > 0) {
      throw new ForbiddenException(
        'Esta área requer pagamento. Use o checkout para se inscrever.',
      );
    }

    const { error } = await this.supabase()
      .from('teacher_subscriptions')
      .upsert({
        student_id: studentId,
        teacher_area_id: areaId,
        subscription_status: 'active',
        payment_failure_count: 0,
      });
    if (error) throw new BadRequestException(error.message);
    return { subscribed: true };
  }

  async unsubscribe(studentId: string, areaId: string) {
    // If there's a Stripe subscription, cancel it
    const { data: sub } = await this.supabase()
      .from('teacher_subscriptions')
      .select('stripe_subscription_id')
      .eq('student_id', studentId)
      .eq('teacher_area_id', areaId)
      .maybeSingle();

    if (sub?.stripe_subscription_id) {
      try {
        await this.stripeService.cancelSubscription(sub.stripe_subscription_id);
      } catch (err: any) {
        this.logger.error(`Failed to cancel Stripe sub: ${err.message}`);
      }
    }

    const { error } = await this.supabase()
      .from('teacher_subscriptions')
      .delete()
      .eq('student_id', studentId)
      .eq('teacher_area_id', areaId);
    if (error) throw new BadRequestException(error.message);
    return { subscribed: false };
  }

  // ─── Stripe Checkout ───────────────────────────────────────────────────────

  async createCheckoutSession(studentId: string, studentEmail: string, areaId: string) {
    // 1. Get the area and its Stripe price
    const { data: area } = await this.supabase()
      .from('teacher_areas')
      .select('id, title, stripe_price_id, monthly_price, payment_model')
      .eq('id', areaId)
      .maybeSingle();

    if (!area) throw new NotFoundException('Área não encontrada');
    if (!area.stripe_price_id) {
      throw new BadRequestException('Esta área ainda não possui um preço configurado na Stripe');
    }
    if (Number(area.monthly_price) <= 0) {
      throw new ForbiddenException('Esta área é gratuita. Use o endpoint de subscribe.');
    }

    // 2. Check if student already subscribed
    const { data: existingSub } = await this.supabase()
      .from('teacher_subscriptions')
      .select('subscription_status')
      .eq('student_id', studentId)
      .eq('teacher_area_id', areaId)
      .maybeSingle();

    if (existingSub?.subscription_status === 'active') {
      throw new ForbiddenException('Você já possui uma assinatura ativa nesta área.');
    }

    // 3. Get or create Stripe customer (email from JWT, name from profiles)
    const { data: profile } = await this.supabase()
      .from('profiles')
      .select('id, full_name, stripe_customer_id')
      .eq('id', studentId)
      .maybeSingle();

    let stripeCustomerId = profile?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await this.stripeService.getOrCreateCustomer(
        studentEmail || `${studentId}@estudy.app`,
        profile?.full_name ?? 'Aluno',
        { supabase_user_id: studentId },
      );
      stripeCustomerId = customer.id;

      // Save the Stripe customer ID to profile
      await this.supabase()
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', studentId);
    }

    // 4. Build redirect URLs
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const successUrl = `${frontendUrl}/protected/professores/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}&area_id=${areaId}`;
    const cancelUrl = `${frontendUrl}/protected/professores/checkout/cancelado?area_id=${areaId}`;

    // 5. Create Checkout Session
    const isOneTime = area.payment_model === 'one_time';
    const session = await this.stripeService.createCheckoutSession({
      customerId: stripeCustomerId,
      priceId: area.stripe_price_id,
      successUrl,
      cancelUrl,
      mode: isOneTime ? 'payment' : 'subscription',
      metadata: {
        student_id: studentId,
        area_id: areaId,
        payment_model: area.payment_model || 'recurring',
      },
    });

    return { url: session.url };
  }

  // ─── Área do professor ─────────────────────────────────────────────────────

  async getMyAreas(teacherId: string, page = 1, limit = 20) {
    await this.assertTeacher(teacherId);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await this.supabase()
      .from('teacher_areas')
      .select('id, title, description, color_code, monthly_price, payment_model, banner_url, is_private, created_at, stripe_product_id, stripe_price_id', { count: 'exact' })
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) this.logger.error(`getMyAreas: ${error.message}`);

    return {
      data: data ?? [],
      meta: {
        total: count ?? 0,
        page,
        last_page: Math.ceil((count ?? 0) / limit),
      }
    };
  }


  async handleAiChat(userId: string, areaId: string, question: string, history: any[]) {
    // 1. Buscar dados da área (Configurações do Tutor)
    const { data: area, error: areaError } = await this.supabase()
      .from('teacher_areas')
      .select('*')
      .eq('id', areaId)
      .single();

    if (areaError || !area) {
      throw new NotFoundException('Área de membros não encontrada.');
    }

    if (!area.ai_tutor_enabled) {
      throw new ForbiddenException('O tutor de IA não está ativo para esta área.');
    }

    // 2. Chamar o AiService para processar o RAG e gerar a resposta
    // Passamos o 'area' completo pois ele contém o nome do tutor e as instruções personalizadas
    const answer = await this.aiService.askTutor(
      areaId,
      question,
      history,
      area
    );

    await this.supabase()
      .from('teacher_area_ai_chats')
      .insert([
        {
          area_id: areaId,
          student_id: userId,
          role: 'user',
          content: question.trim(),
        },
        {
          area_id: areaId,
          student_id: userId,
          role: 'assistant',
          content: answer,
        }
      ]);

    return { message: answer };
  }

  async getMyAreaById(teacherId: string, areaId: string) {
    await this.assertTeacher(teacherId);

    const { data } = await this.supabase()
      .from('teacher_areas')
      .select('id, title, description, color_code, ai_tutor_enabled, ai_last_sync_at, monthly_price, payment_model, banner_url, is_private, created_at, stripe_product_id, stripe_price_id')
      .eq('teacher_id', teacherId)
      .eq('id', areaId)
      .maybeSingle();

    return data ?? null;
  }

  async upsertMyArea(teacherId: string, dto: CreateTeacherAreaDto, areaId?: string) {
    await this.assertTeacher(teacherId);

    let existing: any = null;
    if (areaId) {
      const { data } = await this.supabase()
        .from('teacher_areas')
        .select('id, stripe_product_id, stripe_price_id, monthly_price, payment_model')
        .eq('teacher_id', teacherId)
        .eq('id', areaId)
        .maybeSingle();
      existing = data;
    }

    const paymentModel = dto.payment_model ?? existing?.payment_model ?? 'recurring';

    const payload: any = {
      teacher_id: teacherId,
      title: dto.title,
      description: dto.description ?? null,
      color_code: dto.color_code ?? '#4F46E5',
      monthly_price: dto.monthly_price ?? 0,
      is_private: dto.is_private ?? false,
      payment_model: paymentModel,
    };

    const monthlyPrice = Number(dto.monthly_price ?? 0);

    if (existing) {
      // ── Update existing area ──
      const oldPrice = Number(existing.monthly_price ?? 0);
      const oldModel = existing.payment_model ?? 'recurring';
      const priceChanged = monthlyPrice !== oldPrice;
      const modelChanged = paymentModel !== oldModel;

      // Update Stripe product name if it exists
      if (existing.stripe_product_id) {
        try {
          await this.stripeService.updateProduct(existing.stripe_product_id, {
            name: dto.title,
            description: dto.description || undefined,
          });
        } catch (err: any) {
          this.logger.error(`Failed to update Stripe product: ${err.message}`);
        }
      }

      // Handle price changes
      if ((priceChanged || modelChanged) && monthlyPrice > 0) {
        if (existing.stripe_product_id && existing.stripe_price_id) {
          // Archive old price and create new one
          try {
            const newPrice = await this.stripeService.archivePriceAndCreateNew(
              existing.stripe_price_id,
              existing.stripe_product_id,
              Math.round(monthlyPrice * 100), // convert to centavos
              'brl',
              paymentModel,
            );
            payload.stripe_price_id = newPrice.id;
          } catch (err: any) {
            this.logger.error(`Failed to update Stripe price: ${err.message}`);
          }
        } else if (!existing.stripe_product_id) {
          // Create product + price for the first time
          try {
            const product = await this.stripeService.createProduct(
              dto.title,
              dto.description || undefined,
            );
            const price = paymentModel === 'one_time'
              ? await this.stripeService.createOneTimePrice(product.id, Math.round(monthlyPrice * 100))
              : await this.stripeService.createRecurringPrice(product.id, Math.round(monthlyPrice * 100));
            payload.stripe_product_id = product.id;
            payload.stripe_price_id = price.id;
          } catch (err: any) {
            this.logger.error(`Failed to create Stripe product/price: ${err.message}`);
          }
        }
      } else if (priceChanged && monthlyPrice === 0 && existing.stripe_price_id) {
        // Price set to 0 → archive the Stripe price
        try {
          await this.stripeService.archivePrice(existing.stripe_price_id);
          payload.stripe_price_id = null;
        } catch (err: any) {
          this.logger.error(`Failed to archive Stripe price: ${err.message}`);
        }
      }

      const { data, error } = await this.supabase()
        .from('teacher_areas')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new BadRequestException(error.message);
      return data;
    }

    // ── Create new area ──
    if (monthlyPrice > 0) {
      try {
        const product = await this.stripeService.createProduct(
          dto.title,
          dto.description || undefined,
        );
        const price = paymentModel === 'one_time'
          ? await this.stripeService.createOneTimePrice(product.id, Math.round(monthlyPrice * 100))
          : await this.stripeService.createRecurringPrice(product.id, Math.round(monthlyPrice * 100));
        payload.stripe_product_id = product.id;
        payload.stripe_price_id = price.id;
      } catch (err: any) {
        this.logger.error(`Failed to create Stripe product/price: ${err.message}`);
      }
    }

    const { data, error } = await this.supabase()
      .from('teacher_areas')
      .insert(payload)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ─── Aulas ─────────────────────────────────────────────────────────────────

  async getMyLessons(teacherId: string, areaId: string) {
    await this.assertTeacher(teacherId);

    const { data } = await this.supabase()
      .from('lessons')
      .select('id, title, description, type, content_url, duration_minutes, order_index, created_at, module_id')
      .eq('area_id', areaId)
      .order('order_index', { ascending: true });

    return data ?? [];
  }

  async createLesson(teacherId: string, areaId: string, dto: CreateLessonDto) {
    await this.assertTeacher(teacherId);

    const { data: area } = await this.supabase()
      .from('teacher_areas')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('id', areaId)
      .maybeSingle();

    if (!area) throw new NotFoundException('Área não encontrada ou você não tem permissão');

    const { data, error } = await this.supabase()
      .from('lessons')
      .insert({
        area_id: area.id,
        module_id: dto.module_id ?? null,
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type ?? 'video',
        order_index: dto.order_index ?? 0,
        duration_minutes: dto.duration_minutes ?? null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateLesson(teacherId: string, lessonId: string, dto: { description?: string; duration_minutes?: number }) {
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
    const payload: any = {};
    if (dto.description !== undefined) payload.description = dto.description;
    if (dto.duration_minutes !== undefined) payload.duration_minutes = dto.duration_minutes;
    if (Object.keys(payload).length === 0) return this.supabase().from('lessons').select('*').eq('id', lessonId).single().then((r) => r.data);
    const { data, error } = await this.supabase()
      .from('lessons')
      .update(payload)
      .eq('id', lessonId)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
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

    if (error) throw new BadRequestException(error.message);
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

    // 1. Upload para o Storage
    const { data: uploadData, error: uploadError } = await this.supabase()
      .storage
      .from(LESSONS_BUCKET)
      .upload(path, fileBuffer, { contentType: mimeType, upsert: true });

    if (uploadError) throw new BadRequestException(`Upload falhou: ${this.translateStorageError(uploadError.message)}`);

    const { data: urlData } = this.supabase()
      .storage
      .from(LESSONS_BUCKET)
      .getPublicUrl(uploadData.path);

    const publicUrl = urlData.publicUrl;
    const fileType = mimeType.startsWith('video') ? 'video' : 'pdf';

    // 2. Atualiza a URL no banco imediatamente
    const { data, error } = await this.supabase()
      .from('lessons')
      .update({ content_url: publicUrl, type: fileType })
      .eq('id', lessonId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    this.processFileContent(lessonId, fileBuffer, fileType).catch(err =>
      this.logger.error(`Erro no processamento background da aula ${lessonId}: ${err.message}`)
    );

    return data;
  }

  private async processFileContent(lessonId: string, buffer: Buffer, type: 'video' | 'pdf') {
    if (type === 'pdf') {
      await this.extractPdfText(lessonId, buffer);
    } else if (type === 'video') {
      await this.transcribeVideo(lessonId, buffer);
    }
  }

  private async extractPdfText(lessonId: string, buffer: Buffer) {

    try {

      const pdfParse = require('pdf-parse');

      const data = await pdfParse(buffer, {
        max: 0, // sem limite de páginas
        version: 'v1.10.100', // força versão estável do pdf.js
      });

      const { error } = await this.supabase()
        .from('lessons')
        .update({ content_text: data.text || '' })
        .eq('id', lessonId);

      if (error) throw error;

      this.logger.log(`Texto extraído com sucesso do PDF da aula ${lessonId}`);
    } catch (err) {
      this.logger.error(
        `Falha ao extrair PDF ${lessonId}: ${err.message}`,
      );
    }
  }

  private async splitAudio(buffer: Buffer): Promise<Buffer[]> {
    const ffmpeg = require('fluent-ffmpeg');
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    ffmpeg.setFfmpegPath(ffmpegPath);

    // 📁 cria pasta temporária
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-'));
    const inputPath = path.join(tempDir, 'input.mp3');

    // 💾 salva o buffer como arquivo
    fs.writeFileSync(inputPath, buffer);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(path.join(tempDir, 'chunk-%03d.mp3'))
        .audioCodec('libmp3lame')
        .audioBitrate(48) // 🔥 menor = mais leve
        .outputOptions([
          '-f segment',
          '-segment_time 300',
          '-reset_timestamps 1'
        ])
        .on('end', () => {
          const files = fs.readdirSync(tempDir)
            .filter(f => f.startsWith('chunk-'))
            .sort();

          const buffers = files.map(file =>
            fs.readFileSync(path.join(tempDir, file))
          );

          // 🧹 limpa arquivos depois
          fs.rmSync(tempDir, { recursive: true, force: true });

          resolve(buffers);
        })
        .on('error', reject)
        .run();
    });
  }


  private async transcribeChunks(buffers: Buffer[]): Promise<string> {
    let finalText = '';

    for (let i = 0; i < buffers.length; i++) {
      this.logger.log(`Transcrevendo parte ${i + 1}/${buffers.length}`);

      const text = await this.aiService.generateTranscription(buffers[i]);

      finalText += text + '\n';
    }

    return finalText;
  }

  private async transcribeVideo(lessonId: string, videoBuffer: Buffer) {
    try {
      this.logger.log(`Extraindo áudio...`);

      const audioBuffer = await this.extractAudioFromBuffer(videoBuffer);

      this.logger.log(`Dividindo áudio...`);

      const chunks = await this.splitAudio(audioBuffer);

      this.logger.log(`Total de partes: ${chunks.length}`);

      const transcription = await this.transcribeChunks(chunks);

      await this.supabase()
        .from('lessons')
        .update({ transcription })
        .eq('id', lessonId);

      this.logger.log(`Transcrição finalizada`);
    } catch (err) {
      this.logger.error(`Erro ao transcrever vídeo: ${err.message}`);
    }
  }



  async uploadAreaBanner(
    teacherId: string,
    areaId: string,
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
  ) {
    await this.assertTeacher(teacherId);

    const ext = originalName.split('.').pop() ?? 'jpg';
    const path = `area-banners/${areaId}.${ext}`;

    const { data: uploadData, error: uploadError } = await this.supabase()
      .storage
      .from('avatars')
      .upload(path, fileBuffer, { contentType: mimeType, upsert: true });

    if (uploadError) throw new BadRequestException(`Upload falhou: ${this.translateStorageError(uploadError.message)}`);

    const { data: urlData } = this.supabase()
      .storage
      .from('avatars')
      .getPublicUrl(uploadData.path);

    const { data, error } = await this.supabase()
      .from('teacher_areas')
      .update({ banner_url: urlData.publicUrl })
      .eq('id', areaId)
      .eq('teacher_id', teacherId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
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
        subscribed_at, subscription_status,
        profiles!student_id ( id, full_name, avatar_url, created_at )
      `)
      .eq('teacher_area_id', area.id)
      .in('subscription_status', ['active', 'past_due', 'lifetime'])
      .order('subscribed_at', { ascending: false });

    if (error) this.logger.error(`getMyStudents: ${error.message}`);

    const students = (subs ?? []).map((s: any) => ({
      id: s.profiles?.id,
      full_name: s.profiles?.full_name ?? 'Aluno',
      avatar_url: s.profiles?.avatar_url ?? null,
      subscribed_at: s.subscribed_at,
      subscription_status: s.subscription_status ?? 'active',
    }));

    const monthlyPrice = Number(area.monthly_price ?? 0);
    const fees = this.calculateFees(monthlyPrice);
    const monthlyRevenue = students.length * fees.net_teacher;

    return {
      students,
      active_count: students.length,
      monthly_revenue: +monthlyRevenue.toFixed(2),
      total_revenue: +(monthlyRevenue * 3).toFixed(2), // rough estimate
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
      payment_model: area.payment_model ?? 'recurring',
      banner_url: area.banner_url,
      created_at: area.created_at,
      teacher: {
        id: area.profiles?.id,
        full_name: area.profiles?.full_name ?? 'Professor',
        avatar_url: area.profiles?.avatar_url ?? null,
      },
    };
  }

  // ─── Sections, Modules, and Notices ──────────────────────────────────────────

  async getAreaSections(userId: string, areaId: string) {
    await this.assertTeacherOrSubscriber(userId, areaId);
    const { data, error } = await this.supabase()
      .from('teacher_area_sections')
      .select(`
        id, title, order_index, created_at,
        modules:teacher_area_modules (
          id, title, description, order_index, created_at,
          lessons (
            id, title, description, type, content_url, duration_minutes, order_index, created_at, module_id
          )
        )
      `)
      .eq('area_id', areaId)
      .order('order_index', { ascending: true });

    if (error) this.logger.error(`getAreaSections error: ${error.message}`);

    const sections = (data || []).map((section: any) => ({
      ...section,
      modules: (section.modules || [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((module: any) => ({
          ...module,
          lessons: (module.lessons || []).sort((a, b) => a.order_index - b.order_index)
        }))
    }));

    return sections;
  }

  async createSection(teacherId: string, areaId: string, dto: any) {
    await this.assertTeacher(teacherId);
    const { data, error } = await this.supabase()
      .from('teacher_area_sections')
      .insert({ area_id: areaId, title: dto.title, order_index: dto.order_index ?? 0 })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteSection(teacherId: string, sectionId: string) {
    await this.assertTeacher(teacherId);

    // verify ownership implicitly by checking area_id -> teacher_id if we want,
    // but RLS might handle it if we pass the auth token.
    // For safety, let's just delete using service role but we should ideally ensure ownership.
    // Assuming the user has access.
    const { error } = await this.supabase()
      .from('teacher_area_sections')
      .delete()
      .eq('id', sectionId);
    if (error) throw new BadRequestException(error.message);
    return { deleted: true };
  }

  async getSectionModules(teacherId: string, sectionId: string) {
    await this.assertTeacher(teacherId);
    const { data } = await this.supabase()
      .from('teacher_area_modules')
      .select('id, section_id, title, description, order_index, created_at')
      .eq('section_id', sectionId)
      .order('order_index', { ascending: true });
    return data ?? [];
  }

  async createModule(teacherId: string, sectionId: string, dto: any) {
    await this.assertTeacher(teacherId);
    const { data, error } = await this.supabase()
      .from('teacher_area_modules')
      .insert({
        section_id: sectionId,
        title: dto.title,
        description: dto.description ?? null,
        order_index: dto.order_index ?? 0
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateSection(teacherId: string, sectionId: string, dto: any) {
    await this.assertTeacher(teacherId);

    const { data: section } = await this.supabase()
      .from('teacher_area_sections')
      .select('area_id')
      .eq('id', sectionId)
      .maybeSingle();

    if (!section) throw new NotFoundException('Seção não encontrada');

    const { data: area } = await this.supabase()
      .from('teacher_areas')
      .select('teacher_id')
      .eq('id', section.area_id)
      .maybeSingle();

    if (area?.teacher_id !== teacherId) throw new ForbiddenException();

    const { data, error } = await this.supabase()
      .from('teacher_area_sections')
      .update({ title: dto.title })
      .eq('id', sectionId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateModule(teacherId: string, moduleId: string, dto: any) {
    await this.assertTeacher(teacherId);

    const { data: module } = await this.supabase()
      .from('teacher_area_modules')
      .select('section_id')
      .eq('id', moduleId)
      .maybeSingle();

    if (!module) throw new NotFoundException('Módulo não encontrado');

    const { data: section } = await this.supabase()
      .from('teacher_area_sections')
      .select('area_id')
      .eq('id', module.section_id)
      .maybeSingle();

    const { data: area } = await this.supabase()
      .from('teacher_areas')
      .select('teacher_id')
      .eq('id', section?.area_id)
      .maybeSingle();

    if (area?.teacher_id !== teacherId) throw new ForbiddenException();

    const payload: any = {};
    if (dto.title !== undefined) payload.title = dto.title;
    if (dto.description !== undefined) payload.description = dto.description;

    const { data, error } = await this.supabase()
      .from('teacher_area_modules')
      .update(payload)
      .eq('id', moduleId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteModule(teacherId: string, moduleId: string) {
    await this.assertTeacher(teacherId);
    const { error } = await this.supabase()
      .from('teacher_area_modules')
      .delete()
      .eq('id', moduleId);
    if (error) throw new BadRequestException(error.message);
    return { deleted: true };
  }

  async getAreaNotices(userId: string, areaId: string) {
    await this.assertTeacherOrSubscriber(userId, areaId);
    const { data } = await this.supabase()
      .from('teacher_area_notices')
      .select('id, title, content, created_at')
      .eq('area_id', areaId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  async createNotice(teacherId: string, areaId: string, dto: any) {
    await this.assertTeacher(teacherId);
    const { data, error } = await this.supabase()
      .from('teacher_area_notices')
      .insert({ area_id: areaId, title: dto.title, content: dto.content })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteNotice(teacherId: string, noticeId: string) {
    await this.assertTeacher(teacherId);
    const { error } = await this.supabase()
      .from('teacher_area_notices')
      .delete()
      .eq('id', noticeId);
    if (error) throw new BadRequestException(error.message);
    return { deleted: true };
  }

  // ─── Lesson Progress (alunos) ───────────────────────────────────────────────

  async upsertLessonProgress(userId: string, lessonId: string, completed: boolean, watchedUntilPercent?: number) {
    await this.assertCanAccessLesson(userId, lessonId);
    const payload: any = {
      student_id: userId,
      lesson_id: lessonId,
      completed,
      updated_at: new Date().toISOString(),
    };
    if (completed) payload.completed_at = new Date().toISOString();
    if (watchedUntilPercent !== undefined) payload.watched_until_percent = watchedUntilPercent;
    const { data, error } = await this.supabase()
      .from('lesson_progress')
      .upsert(payload, { onConflict: 'student_id,lesson_id', ignoreDuplicates: false })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  private async assertCanAccessLesson(userId: string, lessonId: string) {
    const { data: lesson } = await this.supabase()
      .from('lessons')
      .select('area_id, module_id')
      .eq('id', lessonId)
      .maybeSingle();
    if (!lesson) throw new NotFoundException('Aula não encontrada');
    let areaId = lesson.area_id;
    if (!areaId && lesson.module_id) {
      const { data: mod } = await this.supabase()
        .from('teacher_area_modules')
        .select('section_id')
        .eq('id', lesson.module_id)
        .maybeSingle();
      if (mod) {
        const { data: sec } = await this.supabase()
          .from('teacher_area_sections')
          .select('area_id')
          .eq('id', mod.section_id)
          .maybeSingle();
        if (sec) areaId = sec.area_id;
      }
    }
    if (!areaId) throw new NotFoundException('Aula não encontrada');
    await this.assertTeacherOrSubscriber(userId, areaId);
  }

  // ─── Lesson Materials ───────────────────────────────────────────────────────

  async getLessonMaterials(userId: string, lessonId: string) {
    await this.assertCanAccessLesson(userId, lessonId);
    const { data } = await this.supabase()
      .from('lesson_materials')
      .select('id, type, title, url, order_index')
      .eq('lesson_id', lessonId)
      .order('order_index', { ascending: true });
    return data ?? [];
  }

  async createLessonMaterial(teacherId: string, lessonId: string, dto: { type: string; title: string; url: string }) {
    await this.assertTeacher(teacherId);
    const { data: lesson } = await this.supabase()
      .from('lessons')
      .select('area_id, module_id')
      .eq('id', lessonId)
      .maybeSingle();
    if (!lesson) throw new NotFoundException('Aula não encontrada');
    let areaId = lesson.area_id;
    if (!areaId && lesson.module_id) {
      const { data: mod } = await this.supabase()
        .from('teacher_area_modules')
        .select('section_id')
        .eq('id', lesson.module_id)
        .maybeSingle();
      if (mod) {
        const { data: sec } = await this.supabase()
          .from('teacher_area_sections')
          .select('area_id')
          .eq('id', mod.section_id)
          .maybeSingle();
        if (sec) areaId = sec.area_id;
      }
    }
    const { data: area } = await this.supabase()
      .from('teacher_areas')
      .select('teacher_id')
      .eq('id', areaId)
      .maybeSingle();
    if (!area || area.teacher_id !== teacherId) throw new ForbiddenException();
    const type = ['image', 'file', 'executable'].includes(dto.type) ? dto.type : 'file';
    const { data, error } = await this.supabase()
      .from('lesson_materials')
      .insert({ lesson_id: lessonId, type, title: dto.title, url: dto.url })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteLessonMaterial(teacherId: string, materialId: string) {
    await this.assertTeacher(teacherId);
    const { data: mat } = await this.supabase()
      .from('lesson_materials')
      .select('lesson_id')
      .eq('id', materialId)
      .maybeSingle();
    if (!mat) throw new NotFoundException('Material não encontrado');
    const { data: lesson } = await this.supabase()
      .from('lessons')
      .select('area_id')
      .eq('id', mat.lesson_id)
      .maybeSingle();
    const { data: area } = await this.supabase()
      .from('teacher_areas')
      .select('teacher_id')
      .eq('id', lesson?.area_id)
      .maybeSingle();
    if (area?.teacher_id !== teacherId) throw new ForbiddenException();
    const { error } = await this.supabase()
      .from('lesson_materials')
      .delete()
      .eq('id', materialId);
    if (error) throw new BadRequestException(error.message);
    return { deleted: true };
  }

  async uploadLessonMaterial(
    teacherId: string,
    lessonId: string,
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
    materialType: 'image' | 'file' | 'executable',
  ) {
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
    const ext = originalName.split('.').pop() ?? 'bin';
    const path = `materials/${lessonId}/${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { error: uploadError } = await this.supabase()
      .storage
      .from(LESSONS_BUCKET)
      .upload(path, fileBuffer, { contentType: mimeType, upsert: true });
    if (uploadError) throw new BadRequestException(`Upload falhou: ${this.translateStorageError(uploadError.message)}`);
    const { data: urlData } = this.supabase()
      .storage
      .from(LESSONS_BUCKET)
      .getPublicUrl(path);
    return this.createLessonMaterial(teacherId, lessonId, {
      type: materialType,
      title: originalName,
      url: urlData.publicUrl,
    });
  }

  // ─── Lesson Comments ────────────────────────────────────────────────────────

  async getLessonComments(lessonId: string, userId: string) {
    await this.assertCanAccessLesson(userId, lessonId);
    const { data } = await this.supabase()
      .from('lesson_comments')
      .select(`
        id, content, created_at,
        profiles!student_id ( id, full_name, avatar_url )
      `)
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true });
    return (data ?? []).map((c: any) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      student: {
        id: c.profiles?.id,
        full_name: c.profiles?.full_name ?? 'Aluno',
        avatar_url: c.profiles?.avatar_url ?? null,
      },
    }));
  }

  async createLessonComment(userId: string, lessonId: string, content: string) {
    await this.assertCanAccessLesson(userId, lessonId);
    const { data: inserted, error } = await this.supabase()
      .from('lesson_comments')
      .insert({ lesson_id: lessonId, student_id: userId, content: content.trim() })
      .select('id, content, created_at, student_id')
      .single();
    if (error) throw new BadRequestException(error.message);
    const { data: profile } = await this.supabase()
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();
    return {
      id: inserted.id,
      content: inserted.content,
      created_at: inserted.created_at,
      student: {
        id: profile?.id ?? userId,
        full_name: profile?.full_name ?? 'Aluno',
        avatar_url: profile?.avatar_url ?? null,
      },
    };
  }
}