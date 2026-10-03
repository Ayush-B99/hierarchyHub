import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { ApiErrorBody } from '@hierarchy-hub/shared';
import { mapDatabaseError } from '../database/database-errors';

/**
 * every error the api sends back goes through here, so they all have the same shape
 * (docs/api/API.md) and nothing internal ever leaks to the browser
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.adapterHost;
    const context = host.switchToHttp();
    const request = context.getRequest<{ method?: string; url?: string }>();
    const body = this.toBody(exception, `${request.method ?? ''} ${request.url ?? ''}`.trim());
    httpAdapter.reply(context.getResponse(), body, body.statusCode);
  }

  private toBody(exception: unknown, where: string): ApiErrorBody {
    // errors we threw on purpose already have the right status and message
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string')
        return { statusCode: exception.getStatus(), message: response };
      const { message, errors } = response as {
        message?: string | string[];
        errors?: ApiErrorBody['errors'];
      };
      return {
        statusCode: exception.getStatus(),
        message: Array.isArray(message) ? message.join(', ') : (message ?? exception.message),
        ...(errors ? { errors } : {}),
      };
    }

    // a database rule the user broke, eg a duplicate email or a reporting loop
    const mapped = mapDatabaseError(exception);
    if (mapped) {
      if (mapped.status >= 500) this.logger.warn(`${where} -> ${mapped.status} ${mapped.rule}`);
      return {
        statusCode: mapped.status,
        message: mapped.message,
        ...(mapped.field ? { errors: { [mapped.field]: [mapped.message] } } : {}),
      };
    }

    // anything else is a bug on our side. log only the error's type and code, never its
    // message, which for database errors can contain a whole row of personal data
    const name = exception instanceof Error ? exception.name : typeof exception;
    const code = (exception as { code?: string } | null)?.code;
    this.logger.error(`${where} -> 500 unexpected ${name}${code ? ` (${code})` : ''}`);
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Something went wrong on our side. Please try again.',
    };
  }
}
