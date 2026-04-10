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

  async createOneTimePrice(
    productId: string,
    amountInCents: number,
    currency = 'brl',
  ): Promise<Stripe.Price> {
    return this.stripe.prices.create({
      product: productId,
      unit_amount: amountInCents,
      currency,
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
    paymentModel: 'recurring' | 'one_time' = 'recurring',
  ): Promise<Stripe.Price> {
    await this.archivePrice(oldPriceId);
    if (paymentModel === 'one_time') {
      return this.createOneTimePrice(productId, newAmountInCents, currency);
    }
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
    mode: 'subscription' | 'payment';
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: params.customerId,
      mode: params.mode,
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    };

    if (params.mode === 'subscription') {
      // Assinaturas recorrentes: apenas cart\u00e3o.
      // Boleto em modo recorrente gera um novo boleto a cada ciclo (n\u00e3o \u00e9 d\u00e9bito autom\u00e1tico),
      // o que requer tratamento de webhook espec\u00edfico (invoice.paid, async_payment_succeeded).
      // Deixamos desabilitado at\u00e9 o fluxo estar completamente estabilizado.
      sessionParams.payment_method_types = ['card'];
      sessionParams.subscription_data = {
        metadata: params.metadata,
      };
    } else {
      // Pagamento \u00fanico (vitalício): aceita cart\u00e3o e boleto
      sessionParams.currency = 'brl';
      sessionParams.payment_method_types = ['card', 'boleto'];
      sessionParams.payment_intent_data = {
        metadata: params.metadata,
      };
    }

    return this.stripe.checkout.sessions.create(sessionParams);
  }

  // ─── Checkout Sessions (retrieve) ─────────────────────────────────────────

  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }

  // ─── Customer Portal ───────────────────────────────────────────────────────

  async createPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
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
