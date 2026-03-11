import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SupabaseAuthGuard extends AuthGuard('supabase') {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    this.logger.log(`[AUTH] canActivate - Authorization header present: ${!!authHeader}`);
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err) {
      this.logger.error(`[AUTH] handleRequest error: ${err?.message}`, err?.stack);
      throw err;
    }
    if (!user) {
      this.logger.warn(`[AUTH] handleRequest - no user (token invalid or expired)`);
      throw new UnauthorizedException('Authentication failed');
    }
    this.logger.log(`[AUTH] handleRequest - user authenticated: ${user?.id}`);
    return user;
  }
}
