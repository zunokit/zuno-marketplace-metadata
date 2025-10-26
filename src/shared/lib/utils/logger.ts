import { env } from "@/shared/config/env";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private logLevel: LogLevel;

  constructor(level: LogLevel = "info") {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const baseLog = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...context,
    };

    return JSON.stringify(baseLog, null, env.NODE_ENV === "development" ? 2 : 0);
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatLog("debug", message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog("info")) {
      console.info(this.formatLog("info", message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatLog("warn", message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog("error")) {
      console.error(this.formatLog("error", message, context));
    }
  }

  // Helper for logging HTTP requests
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

    this[level](`${method} ${path} ${statusCode}`, {
      duration: `${duration}ms`,
      ...context,
    });
  }

  // Helper for logging errors with stack traces
  logError(error: Error, context?: LogContext): void {
    this.error(error.message, {
      stack: error.stack,
      name: error.name,
      ...context,
    });
  }
}

// Create singleton logger instance
export const logger = new Logger(env.LOG_LEVEL);

export default logger;