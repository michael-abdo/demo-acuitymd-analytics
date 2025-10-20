/**
 * Shared email domain types for the VVG template.
 * These abstractions intentionally stay minimal so they can be reused
 * across different product workflows without pulling invoice-specific logic.
 */

export type EmailRecipientType = 'primary' | 'cc' | 'bcc' | 'admin' | 'test' | 'self';

export interface EmailRecipient {
  email: string;
  name?: string;
  type?: EmailRecipientType;
  reason?: string;
}

export interface EmailDocumentSummary {
  id: number;
  filename: string;
  status?: string;
  ownerEmail?: string;
  createdAt?: string;
  downloadUrl?: string;
}

export interface EmailTemplateContent {
  subject: string;
  html: string;
  text: string;
}

export interface EmailTemplate<TContext = unknown> {
  key: string;
  name: string;
  description?: string;
  render(context: TContext): EmailTemplateContent;
}

export interface EmailTemplateContext {
  actorName?: string;
  customMessage?: string;
  documents?: EmailDocumentSummary[];
  additionalData?: Record<string, unknown>;
}

export interface EmailSendRequest {
  recipients: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  templateKey?: string;
  subjectOverride?: string;
  customMessage?: string;
  documents?: EmailDocumentSummary[];
  actor: {
    email: string;
    name?: string | null;
  };
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  accepted?: string[];
  rejected?: string[];
  envelope?: Record<string, unknown>;
  previewUrl?: string;
}

export interface RecipientResolutionInput {
  actorEmail: string;
  currentUserRecipient: EmailRecipient;
  requestedRecipients?: EmailRecipient[];
  includeAdmin?: boolean;
  includeTest?: boolean;
}

export interface RecipientResolutionResult {
  primary: EmailRecipient[];
  cc: EmailRecipient[];
  bcc: EmailRecipient[];
  all: EmailRecipient[];
}
