import { ApiResponseUtil } from '@/lib/response';
import { 
  ServiceError, 
  ValidationError, 
  AuthorizationError, 
  NotFoundError 
} from '@/lib/services/errors/service-errors';
import { DocumentStatus } from '@/lib/repositories/interfaces/document.repository.interface';

export const ALLOWED_STATUSES: DocumentStatus[] = ['uploaded', 'processing', 'completed', 'failed'];
export const ALLOWED_SORT_BY = new Set(['created_at', 'filename']);
export const ALLOWED_SORT_ORDER = new Set(['asc', 'desc']);

export const mapServiceError = (error: unknown) => {
  if (error instanceof ValidationError) {
    const field = error.context?.field ?? error.context?.fieldName;
    return ApiResponseUtil.validationError(error.message, field);
  }

  if (error instanceof AuthorizationError) {
    return ApiResponseUtil.forbidden(error.userMessage);
  }

  if (error instanceof NotFoundError) {
    return ApiResponseUtil.notFound(error.userMessage);
  }

  if (error instanceof ServiceError) {
    return ApiResponseUtil.error(
      {
        code: error.code,
        message: error.userMessage || error.message,
        details: error.context
      },
      error.statusCode
    );
  }

  return ApiResponseUtil.internalError('An unexpected error occurred');
};

export const parseNumberParam = (value: string | null, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};
