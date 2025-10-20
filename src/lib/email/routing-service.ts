import { resolveEmailConfig } from './config';
import {
  EmailRecipient,
  RecipientResolutionInput,
  RecipientResolutionResult,
} from './types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeRecipient(recipient: EmailRecipient): EmailRecipient | null {
  const email = recipient.email?.trim();
  if (!email || !EMAIL_REGEX.test(email)) {
    return null;
  }

  return {
    email: email.toLowerCase(),
    name: recipient.name?.trim(),
    type: recipient.type ?? 'primary',
    reason: recipient.reason,
  };
}

export class EmailRoutingService {
  resolveRecipients(input: RecipientResolutionInput): RecipientResolutionResult {
    const config = resolveEmailConfig();
    const deduped = new Map<string, EmailRecipient>();

    const addRecipient = (recipient: EmailRecipient | null) => {
      if (!recipient) return;
      const normalized = normalizeRecipient(recipient);
      if (!normalized) return;
      if (!deduped.has(normalized.email)) {
        deduped.set(normalized.email, normalized);
      }
    };

    // Always include the actor so they can track notifications
    addRecipient({
      email: input.actorEmail,
      name: input.currentUserRecipient.name,
      type: 'self',
      reason: 'Triggered by current user',
    });

    input.requestedRecipients?.forEach((recipient) => addRecipient(recipient));

    if (input.includeAdmin && config.adminEmail) {
      addRecipient({
        email: config.adminEmail,
        type: 'admin',
        reason: 'Administrative notification recipient',
      });
    }

    if (input.includeTest && config.testRecipient) {
      addRecipient({
        email: config.testRecipient,
        type: 'test',
        reason: 'SES/Test recipient',
      });
    }

    const all = Array.from(deduped.values());
    const primary = all.filter((r) => !r.type || r.type === 'primary');
    const cc = all.filter((r) => r.type === 'cc');
    const bcc = all.filter((r) => r.type === 'bcc');

    return {
      primary,
      cc,
      bcc,
      all,
    };
  }
}

export const emailRoutingService = new EmailRoutingService();
