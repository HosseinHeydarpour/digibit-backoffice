import { Injectable } from '@angular/core';
import { environment } from '@env/environment';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/**
 * The one place the app talks to the console (BO-C09).
 *
 * Production keeps warnings and errors only; development gets all four. A
 * future Serilog/APM sink replaces the four `console` calls here, not every
 * `console.error` in the codebase. The context object is for identifiers and
 * counts — never a token, a password or a response body.
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly minimum: LogLevel = environment.production ? 'warn' : 'debug';

  debug(message: string, context?: Record<string, unknown>): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.write('error', message, context);
  }

  private write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (ORDER[level] < ORDER[this.minimum]) {
      return;
    }

    const line = `[${level}] ${message}`;

    if (context) {
      console[level](line, context);
    } else {
      console[level](line);
    }
  }
}
