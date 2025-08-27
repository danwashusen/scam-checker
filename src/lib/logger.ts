import pino from 'pino'
import { pinoLambdaDestination } from 'pino-lambda'

export interface LogContext {
  requestId?: string
  userId?: string
  url?: string
  service?: string
  duration?: number
  error?: Error
  [key: string]: unknown
}

class Logger {
  private logger: pino.Logger

  constructor() {
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME
    const isBuild = process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE === 'phase-production-build'
    const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_TEST_ENVIRONMENT === 'jsdom'
    
    if (isTest) {
      // Test environment - use simple logger to avoid worker thread issues with JSDOM
      this.logger = pino({
        level: 'silent', // Minimize test noise
      })
    } else if (isLambda) {
      // Lambda environment - use pino-lambda for CloudWatch optimization
      this.logger = pino(
        {
          level: process.env.LOG_LEVEL || 'info',
          formatters: {
            level: (label) => ({ level: label }),
          },
        },
        pinoLambdaDestination()
      )
    } else if (isBuild) {
      // Build time - use simple logger to avoid worker issues
      this.logger = pino({
        level: 'silent', // Minimize build-time logging
      })
    } else {
      // Local development - pretty print
      this.logger = pino({
        level: process.env.LOG_LEVEL || 'debug',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
            sync: true, // Disable worker threads
          },
        },
      })
    }
  }

  debug(message: string, context?: LogContext) {
    this.logger.debug({ ...context }, message)
  }

  info(message: string, context?: LogContext) {
    this.logger.info({ ...context }, message)
  }

  warn(message: string, context?: LogContext) {
    this.logger.warn({ ...context }, message)
  }

  error(message: string, context?: LogContext) {
    if (context?.error) {
      this.logger.error(
        {
          ...context,
          error: {
            message: context.error.message,
            stack: context.error.stack,
            name: context.error.name,
          },
        },
        message
      )
    } else {
      this.logger.error({ ...context }, message)
    }
  }

  // Convenience method for timing operations
  timer(message: string, context?: LogContext) {
    const start = Date.now()
    return {
      end: (additionalContext?: LogContext) => {
        const duration = Date.now() - start
        this.info(`${message} completed`, {
          ...context,
          ...additionalContext,
          duration,
        })
      },
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export for testing
export { Logger }