import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseJwtGuard.name);

  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization as string | undefined;

    this.logger.log(`[AUTH] Authorization header present: ${!!authHeader}`);

    if (!authHeader?.startsWith('Bearer ')) {
      this.logger.warn('[AUTH] Missing or invalid Authorization header');
      throw new UnauthorizedException('Authentication failed');
    }

    const token = authHeader.slice(7);

    try {
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL')?.replace(/\/$/, '') || '';
      const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
      this.logger.log(`[AUTH] Verifying JWT with JWKS: ${jwksUrl}`);

      const JWKS = createRemoteJWKSet(new URL(jwksUrl));
      const { payload } = await jwtVerify(token, JWKS);

      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      this.logger.log(`[AUTH] User authenticated: ${payload.sub}`);
      return true;
    } catch (err) {
      this.logger.error(`[AUTH] JWT verification failed: ${err?.message}`, err?.stack);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
