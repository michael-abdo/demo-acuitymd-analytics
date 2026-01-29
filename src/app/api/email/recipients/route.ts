import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/api/with-auth';
import { ApiResponseUtil } from '@/lib/response';
import { emailRoutingService } from '@/lib/email/routing-service';
import { resolveEmailConfig, isEmailSendingAllowed } from '@/lib/email/config';
import { logger } from '@/lib/pino-logger';

interface RequestBody {
  documentIds?: Array<number | string>;
  includeAdmin?: boolean;
  includeTestRecipient?: boolean;
}

function toNumber(id: number | string): number | null {
  if (typeof id === 'number') return id;
  const parsed = Number.parseInt(id, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export const POST = withApiAuth(async (request: NextRequest, { userEmail, services }) => {
  let body: RequestBody = {};
  try {
    body = await request.json();
  } catch (error) {
    logger.email.debug(error as Error, 'No body provided when resolving recipients');
  }

  const config = resolveEmailConfig();
  const featureEnabled = isEmailSendingAllowed(config);

  const documentIds = Array.isArray(body.documentIds)
    ? body.documentIds
        .map(toNumber)
        .filter((id): id is number => id !== null)
    : [];

  const { documents } = await services.documentService.getUserDocuments(userEmail, {
    pageSize: 250,
  });

  const filteredDocuments =
    documentIds.length > 0
      ? documents.filter((document) => documentIds.includes(document.id))
      : documents;

  const documentRecipients = new Map<string, { email: string; reason: string }>();
  filteredDocuments.forEach((document) => {
    const ownerEmail = document.user_id?.toLowerCase();
    if (ownerEmail && !documentRecipients.has(ownerEmail)) {
      documentRecipients.set(ownerEmail, {
        email: ownerEmail,
        reason: `Owner of ${document.filename}`,
      });
    }
  });

  const routingResult = emailRoutingService.resolveRecipients({
    actorEmail: userEmail,
    currentUserRecipient: {
      email: userEmail,
      name: undefined,
      type: 'self',
    },
    requestedRecipients: Array.from(documentRecipients.values()).map((recipient) => ({
      email: recipient.email,
      reason: recipient.reason,
    })),
    includeAdmin: body.includeAdmin ?? true,
    includeTest: body.includeTestRecipient ?? config.baseEnvironment === 'development',
  });

  const recipients = routingResult.all.map((recipient) => ({
    email: recipient.email,
    type: recipient.type,
    reason: recipient.reason,
  }));

  return ApiResponseUtil.success({
    feature: {
      enabled: featureEnabled,
      fromAddress: config.fromAddress,
      adminEmail: config.adminEmail,
      testRecipient: config.testRecipient,
    },
    recipients,
    documents: filteredDocuments,
  });
});
