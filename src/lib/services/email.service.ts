export {
  EmailService,
  emailService,
  EmailFeatureDisabledError,
  EmailTransportUnavailableError,
  EmailRecipientError,
} from '@/lib/email/service';

export type {
  EmailSendRequest,
  EmailSendResult,
  EmailRecipient,
  EmailDocumentSummary,
} from '@/lib/email/types';
