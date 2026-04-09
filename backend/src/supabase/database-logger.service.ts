import { ConsoleLogger, Injectable } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class DatabaseLoggerService extends ConsoleLogger {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  error(message: any, stack?: string, context?: string) {
    super.error(message, stack, context);
    this.saveLogToDatabase('error', message, context, stack);
  }

  warn(message: any, context?: string) {
    super.warn(message, context);
    this.saveLogToDatabase('warn', message, context);
  }

  private saveLogToDatabase(level: string, message: any, context?: string, stack?: string) {
    try {
      const db = this.supabaseService.getClient();
      const textMessage = typeof message === 'string' ? message : JSON.stringify(message);
      
      db.from('app_logs').insert({
        level,
        message: textMessage,
        context: context || this.context,
        stack
      }).then(({ error }) => {
        if (error) {
          super.error('Failed to save log to Supabase: ' + error.message, null, 'DatabaseLoggerService');
        }
      });
    } catch (err) {
      super.error('Failed to insert log: ' + err.message, null, 'DatabaseLoggerService');
    }
  }
}
