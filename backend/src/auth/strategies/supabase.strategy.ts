import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jose from 'jose';
import jwksRsa = require('jwks-rsa');

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  private readonly logger = new Logger(SupabaseStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = configService.get<string>('SUPABASE_URL')?.replace(/\/$/, '') || '';
    const jwksUri = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
    const jwtSecret = configService.get<string>('SUPABASE_JWT_SECRET');

    const jwksClient = jwksRsa({
      cache: true,
      cacheMaxAge: 600000,
      rateLimit: true,
      jwksUri,
    });

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (req, rawJwtToken, done) => {
        try {
          this.logger.log(`[AUTH] JWT received, length=${rawJwtToken?.length}`);
          const header = jose.decodeProtectedHeader(rawJwtToken);
          const alg = header.alg;
          this.logger.log(`[AUTH] JWT alg=${alg}, kid=${header.kid}`);

          if (alg === 'HS256' && jwtSecret) {
            this.logger.log(`[AUTH] Using HS256 with JWT secret`);
            return done(null, jwtSecret);
          }

          jwksClient.getSigningKey(header.kid)
            .then((key) => {
              this.logger.log(`[AUTH] Got signing key from JWKS for kid=${header.kid}`);
              done(null, key.getPublicKey());
            })
            .catch((err) => {
              this.logger.error(`[AUTH] JWKS getSigningKey failed: ${err?.message}`, err?.stack);
              done(err, undefined);
            });
        } catch (err) {
          this.logger.error(`[AUTH] secretOrKeyProvider error: ${err?.message}`, err?.stack);
          done(err, undefined);
        }
      },
      algorithms: ['RS256', 'ES256', 'HS256'],
    });
  }

  async validate(payload: any) {
    this.logger.log(`[AUTH] validate() payload: sub=${payload?.sub}, email=${payload?.email}`);
    if (!payload) {
      this.logger.warn(`[AUTH] validate() - payload is null/undefined`);
      throw new UnauthorizedException('Invalid token payload');
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
