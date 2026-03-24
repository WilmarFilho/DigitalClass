import {
  Controller,
  Post,
  Req,
  Res,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { SupabaseService } from '../supabase/supabase.service';
import Stripe from 'stripe';

@Controller('stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private supabase() {
    return this.supabaseService.getClient();
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Req() req: any, @Res() res: any) {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      this.logger.warn('Webhook received without stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    let event: Stripe.Event;
    try {
      event = this.stripeService.constructWebhookEvent(
        req.rawBody ?? req.body as any,
        signature,
      );
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    this.logger.log(`Stripe event received: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (err: any) {
      this.logger.error(`Error processing webhook ${event.type}: ${err.message}`);
    }

    return res.json({ received: true });
  }

  // ─── Event Handlers ──────────────────────────────────────────────────────

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const studentId = session.metadata?.student_id;
    const areaId = session.metadata?.area_id;
    const subscriptionId = session.subscription as string;
    const paymentIntentId = session.payment_intent as string;

    if (!studentId || !areaId) {
      this.logger.warn('checkout.session.completed missing metadata (student_id, area_id)');
      return;
    }

    const isOneTime = !subscriptionId;

    this.logger.log(
      `Checkout completed: student=${studentId}, area=${areaId}, sub=${subscriptionId || 'one_time'}, pi=${paymentIntentId || 'none'}`,
    );

    // Upsert the teacher_subscriptions record
    const { error } = await this.supabase()
      .from('teacher_subscriptions')
      .upsert(
        {
          student_id: studentId,
          teacher_area_id: areaId,
          stripe_subscription_id: subscriptionId || null,
          subscription_status: isOneTime ? 'lifetime' : 'active',
          payment_failure_count: 0,
        },
        { onConflict: 'student_id,teacher_area_id' },
      );

    if (error) {
      this.logger.error(`Failed to upsert subscription: ${error.message}`);
    } else {
      this.logger.log(`${isOneTime ? 'One-time access' : 'Subscription'} activated for student ${studentId} in area ${areaId}`);
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = (invoice as any).subscription as string;
    if (!subscriptionId) return;

    this.logger.log(`Payment failed for subscription ${subscriptionId}`);

    // Find the subscription record
    const { data: sub, error: fetchError } = await this.supabase()
      .from('teacher_subscriptions')
      .select('student_id, teacher_area_id, payment_failure_count')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (fetchError || !sub) {
      this.logger.warn(`Subscription ${subscriptionId} not found in DB`);
      return;
    }

    const newCount = (sub.payment_failure_count ?? 0) + 1;

    if (newCount >= 3) {
      // Cancel the subscription in Stripe and our DB
      this.logger.log(
        `Cancelling subscription ${subscriptionId} after ${newCount} payment failures`,
      );

      try {
        await this.stripeService.cancelSubscription(subscriptionId);
      } catch (err: any) {
        this.logger.error(`Failed to cancel Stripe subscription: ${err.message}`);
      }

      const { error } = await this.supabase()
        .from('teacher_subscriptions')
        .update({
          subscription_status: 'cancelled',
          payment_failure_count: newCount,
        })
        .eq('stripe_subscription_id', subscriptionId);

      if (error) this.logger.error(`Failed to update cancelled sub: ${error.message}`);
    } else {
      // Just increment the count and mark as past_due
      const { error } = await this.supabase()
        .from('teacher_subscriptions')
        .update({
          subscription_status: 'past_due',
          payment_failure_count: newCount,
        })
        .eq('stripe_subscription_id', subscriptionId);

      if (error) this.logger.error(`Failed to increment failure count: ${error.message}`);
      this.logger.log(`Payment failure #${newCount} for subscription ${subscriptionId}`);
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const subscriptionId = subscription.id;

    this.logger.log(`Subscription deleted: ${subscriptionId}`);

    const { error } = await this.supabase()
      .from('teacher_subscriptions')
      .update({ subscription_status: 'cancelled' })
      .eq('stripe_subscription_id', subscriptionId);

    if (error) {
      this.logger.error(`Failed to deactivate subscription ${subscriptionId}: ${error.message}`);
    }
  }
}
