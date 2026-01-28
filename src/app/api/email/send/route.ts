import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { ApiResponseUtil } from '@/lib/response';
import {
  EmailRecipient,
  EmailSendRequest as DomainEmailSendRequest,
  EmailFeatureDisabledError,
  EmailTransportUnavailableError,
  EmailRecipientError,
} from '@/lib/services/email.service';
import { resolveEmailConfig, isEmailSendingAllowed } from '@/lib/email/config';
import { logger } from '@/lib/pino-logger';
import { validateEmail } from '@/lib/validation/email';

interface RequestRecipient {
  email: string;
  name?: string;
  type?: string;
}

interface SendRequestBody {
  recipients?: Array<string | RequestRecipient>;
  cc?: Array<string | RequestRecipient>;
  bcc?: Array<string | RequestRecipient>;
  documentIds?: Array<number | string>;
  message?: string;
  subject?: string;
  templateKey?: string;
  includeAdmin?: boolean;
  includeTestRecipient?: boolean;
}

function normalizeRecipient(input: string | RequestRecipient): EmailRecipient | null {
  const emailStr = typeof input === 'string' ? input : input?.email;
  if (!emailStr) return null;

  // SECURITY: Validate email format
  const validation = validateEmail(emailStr);
  if (!validation.isValid || !validation.sanitized) {
    return null;
  }

  if (typeof input === 'string') {
    return { email: validation.sanitized };
  }

  return {
    email: validation.sanitized,
    name: input.name,
    type: input.type as EmailRecipient['type'],
  };
}

function toNumber(id: number | string): number | null {
  if (typeof id === 'number') return id;
  const parsed = Number.parseInt(id, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export const POST = withAuth(async (request: NextRequest, { userEmail, session, services }) => {
  let body: SendRequestBody;

  try {
    body = await request.json();
  } catch {
    return ApiResponseUtil.validationError('Request body must be valid JSON');
  }

  const config = resolveEmailConfig();
  if (!isEmailSendingAllowed(config)) {
    return ApiResponseUtil.error(
      {
        code: 'EMAIL_FEATURE_DISABLED',
        message:
          'Email sending is disabled. Set ENABLE_EMAIL=true and provide SMTP credentials to enable this feature.',
      },
      400
    );
  }

  const recipients = (body.recipients ?? [])
    .map(normalizeRecipient)
    .filter((recipient): recipient is EmailRecipient => Boolean(recipient));

  if (recipients.length === 0) {
    return ApiResponseUtil.validationError('At least one recipient is required', 'recipients');
  }

  const ccRecipients = (body.cc ?? [])
    .map(normalizeRecipient)
    .filter((recipient): recipient is EmailRecipient => Boolean(recipient));

  const bccRecipients = (body.bcc ?? [])
    .map(normalizeRecipient)
    .filter((recipient): recipient is EmailRecipient => Boolean(recipient));

  const documentIds = Array.isArray(body.documentIds)
    ? body.documentIds
        .map(toNumber)
        .filter((id): id is number => id !== null)
    : [];

  const { documents } = await services.documentService.getUserDocuments(userEmail, {
    pageSize: 250,
  });

  const selectedDocuments =
    documentIds.length > 0
      ? documents.filter((document) => documentIds.includes(document.id))
      : documents;

  const mappedDocuments = selectedDocuments.map((document) => ({
    id: document.id,
    filename: document.filename,
    status: document.status,
    ownerEmail: document.user_id,
    createdAt: document.created_at,
    downloadUrl: document.download_url,
  }));

  const payload: DomainEmailSendRequest = {
    recipients,
    cc: ccRecipients,
    bcc: bccRecipients,
    templateKey: body.templateKey,
    subjectOverride: body.subject,
    customMessage: body.message,
    documents: mappedDocuments,
    actor: {
      email: userEmail,
      name: session.user?.name,
    },
  };

  try {
    const result = await services.emailService.sendEmail(payload, {
      includeAdmin: body.includeAdmin ?? true,
      includeTestRecipient: body.includeTestRecipient ?? config.baseEnvironment === 'development',
    });

    return ApiResponseUtil.success(result, undefined, 202);
  } catch (error) {
    if (error instanceof EmailFeatureDisabledError) {
      return ApiResponseUtil.error(
        {
          code: 'EMAIL_FEATURE_DISABLED',
          message: error.message,
        },
        400
      );
    }

    if (error instanceof EmailRecipientError) {
      return ApiResponseUtil.validationError(error.message, 'recipients');
    }

    if (error instanceof EmailTransportUnavailableError) {
      return ApiResponseUtil.error(
        {
          code: 'EMAIL_TRANSPORT_UNAVAILABLE',
          message: error.message,
        },
        503
      );
    }

    logger.email.error(error as Error, 'Unexpected error while sending email');
    return ApiResponseUtil.internalError('Failed to send email');
  }
});
