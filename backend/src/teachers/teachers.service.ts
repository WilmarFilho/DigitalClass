import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { StripeService } from '../stripe/stripe.service';
import { CreateTeacherAreaDto } from './dto/create-teacher-area.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';

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
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

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

  /** Detalhe de uma área específica (respeita RLS: áreas privadas só para o dono) */
  async getAreaById(areaId: string) {
    const { data, error } = await this.supabase()
      .from('teacher_areas')
      .select(`
        id, title, description, color_code, monthly_price, banner_url, is_private, created_at,
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
  async listFollowing(studentId: string) {
    const { data, error } = await this.supabase()
      .from('teacher_subscriptions')
      .select(`
        subscribed_at, subscription_status,
        teacher_areas (
          id, title, description, color_code, monthly_price, banner_url, created_at,
          profiles!teacher_id ( id, full_name, avatar_url )
        )
      `)
      .eq('student_id', studentId)
      .in('subscription_status', ['active', 'past_due']);

    if (error) this.logger.error(`listFollowing: ${error.message}`);

    return (data ?? []).map((row: any) => ({
      subscribed_at: row.subscribed_at,
      subscription_status: row.subscription_status ?? 'active',
      ...this.formatArea(row.teacher_areas),
    }));
  }

  /** Quantidade de alunos em cada área */
  async getAreaStudentCount(areaId: string): Promise<number> {
    const { count } = await this.supabase()
      .from('teacher_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_area_id', areaId)
      .in('subscription_status', ['active', 'past_due']);
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
        .in('subscription_status', ['active', 'past_due'])
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
    if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
    return { subscribed: false };
  }

  // ─── Stripe Checkout ───────────────────────────────────────────────────────

  async createCheckoutSession(studentId: string, studentEmail: string, areaId: string) {
    // 1. Get the area and its Stripe price
    const { data: area } = await this.supabase()
      .from('teacher_areas')
      .select('id, title, stripe_price_id, monthly_price')
      .eq('id', areaId)
      .maybeSingle();

    if (!area) throw new NotFoundException('Área não encontrada');
    if (!area.stripe_price_id) {
      throw new Error('Esta área ainda não possui um preço configurado na Stripe');
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
    const session = await this.stripeService.createCheckoutSession({
      customerId: stripeCustomerId,
      priceId: area.stripe_price_id,
      successUrl,
      cancelUrl,
      metadata: {
        student_id: studentId,
        area_id: areaId,
      },
    });

    return { url: session.url };
  }

  // ─── Área do professor ─────────────────────────────────────────────────────

  async getMyArea(teacherId: string) {
    await this.assertTeacher(teacherId);

    const { data } = await this.supabase()
      .from('teacher_areas')
      .select('id, title, description, color_code, monthly_price, banner_url, is_private, created_at, stripe_product_id, stripe_price_id')
      .eq('teacher_id', teacherId)
      .maybeSingle();

    return data ?? null;
  }

  async upsertMyArea(teacherId: string, dto: CreateTeacherAreaDto) {
    await this.assertTeacher(teacherId);

    const { data: existing } = await this.supabase()
      .from('teacher_areas')
      .select('id, stripe_product_id, stripe_price_id, monthly_price')
      .eq('teacher_id', teacherId)
      .maybeSingle();

    const payload: any = {
      teacher_id: teacherId,
      title: dto.title,
      description: dto.description ?? null,
      color_code: dto.color_code ?? '#4F46E5',
      monthly_price: dto.monthly_price ?? 0,
      is_private: dto.is_private ?? false,
    };

    const monthlyPrice = Number(dto.monthly_price ?? 0);

    if (existing) {
      // ── Update existing area ──
      const oldPrice = Number(existing.monthly_price ?? 0);
      const priceChanged = monthlyPrice !== oldPrice;

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
      if (priceChanged && monthlyPrice > 0) {
        if (existing.stripe_product_id && existing.stripe_price_id) {
          // Archive old price and create new one
          try {
            const newPrice = await this.stripeService.archivePriceAndCreateNew(
              existing.stripe_price_id,
              existing.stripe_product_id,
              Math.round(monthlyPrice * 100), // convert to centavos
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
            const price = await this.stripeService.createRecurringPrice(
              product.id,
              Math.round(monthlyPrice * 100),
            );
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
      if (error) throw new Error(error.message);
      return data;
    }

    // ── Create new area ──
    if (monthlyPrice > 0) {
      try {
        const product = await this.stripeService.createProduct(
          dto.title,
          dto.description || undefined,
        );
        const price = await this.stripeService.createRecurringPrice(
          product.id,
          Math.round(monthlyPrice * 100),
        );
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
        subscribed_at, subscription_status,
        profiles!student_id ( id, full_name, avatar_url, created_at )
      `)
      .eq('teacher_area_id', area.id)
      .in('subscription_status', ['active', 'past_due'])
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