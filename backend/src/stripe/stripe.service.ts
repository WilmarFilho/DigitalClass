import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured');
    }
    this.stripe = new Stripe(secretKey || '', {
      apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
    });
  }

  // ─── Products ──────────────────────────────────────────────────────────────

  async createProduct(name: string, description?: string): Promise<Stripe.Product> {
    return this.stripe.products.create({
      name,
      description: description || undefined,
    });
  }

  async updateProduct(
    productId: string,
    updates: { name?: string; description?: string },
  ): Promise<Stripe.Product> {
    return this.stripe.products.update(productId, updates);
  }

  // ─── Prices ────────────────────────────────────────────────────────────────

  async createRecurringPrice(
    productId: string,
    amountInCents: number,
    currency = 'brl',
    interval: Stripe.PriceCreateParams.Recurring.Interval = 'month',
  ): Promise<Stripe.Price> {
    return this.stripe.prices.create({
      product: productId,
      unit_amount: amountInCents,
      currency,
      recurring: { interval },
    });
  }

  async archivePrice(priceId: string): Promise<Stripe.Price> {
    return this.stripe.prices.update(priceId, { active: false });
  }

  async archivePriceAndCreateNew(
    oldPriceId: string,
    productId: string,
    newAmountInCents: number,
    currency = 'brl',
  ): Promise<Stripe.Price> {
    await this.archivePrice(oldPriceId);
    return this.createRecurringPrice(productId, newAmountInCents, currency);
  }

  // ─── Customers ─────────────────────────────────────────────────────────────

  async createCustomer(
    email: string,
    name: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Customer> {
    return this.stripe.customers.create({ email, name, metadata });
  }

  async findCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
    const list = await this.stripe.customers.list({ email, limit: 1 });
    return list.data[0] ?? null;
  }

  async getOrCreateCustomer(
    email: string,
    name: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Customer> {
    const existing = await this.findCustomerByEmail(email);
    if (existing) return existing;
    return this.createCustomer(email, name, metadata);
  }

  // ─── Checkout Sessions ─────────────────────────────────────────────────────

  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      subscription_data: {
        metadata: params.metadata,
      },
    });
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  // ─── Webhooks ──────────────────────────────────────────────────────────────

  constructWebhookEvent(
    body: Buffer,
    signature: string,
  ): Stripe.Event {
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    return this.stripe.webhooks.constructEvent(body, signature, secret);
  }
}
