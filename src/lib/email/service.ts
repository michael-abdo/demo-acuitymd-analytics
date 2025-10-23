import nodemailer from 'nodemailer';
import { logger } from '@/lib/pino-logger';
import {
  EmailDocumentSummary,
  EmailRecipient,
  EmailSendRequest,
  EmailSendResult,
  EmailTemplate,
  EmailTemplateContext,
} from './types';
import { emailRoutingService, EmailRoutingService } from './routing-service';
import {
  getDefaultFromAddress,
  getEmailTransport,
  resetEmailTransport,
} from './transport';
import { resolveEmailConfig, isEmailSendingAllowed } from './config';
import { basicNotificationTemplate } from './templates/basic-notification';

export class EmailFeatureDisabledError extends Error {
  constructor(message = 'Email feature is disabled') {
    super(message);
    this.name = 'EmailFeatureDisabledError';
  }
}

export class EmailTransportUnavailableError extends Error {
  constructor(message = 'Email transport is not configured') {
    super(message);
    this.name = 'EmailTransportUnavailableError';
  }
}

export class EmailRecipientError extends Error {
  constructor(message = 'No valid email recipients were provided') {
    super(message);
    this.name = 'EmailRecipientError';
  }
}

function formatAddress(recipient: EmailRecipient): string {
  if (recipient.name) {
    return `"${recipient.name}" <${recipient.email}>`;
  }
  return recipient.email;
}

interface SendOptions {
  includeAdmin?: boolean;
  includeTestRecipient?: boolean;
}

export class EmailService {
  private readonly templates = new Map<string, EmailTemplate<EmailTemplateContext>>();
  private readonly defaultTemplateKey: string;
  private readonly routing: EmailRoutingService;

  constructor(routing: EmailRoutingService = emailRoutingService) {
    this.routing = routing;
    this.registerTemplate(basicNotificationTemplate);
    this.defaultTemplateKey = basicNotificationTemplate.key;
  }

  registerTemplate(template: EmailTemplate<EmailTemplateContext>): void {
    this.templates.set(template.key, template);
  }

  getTemplate(templateKey?: string): EmailTemplate<EmailTemplateContext> {
    if (templateKey && this.templates.has(templateKey)) {
      return this.templates.get(templateKey)!;
    }
    return this.templates.get(this.defaultTemplateKey)!;
  }

  buildTemplateContext(payload: EmailSendRequest): EmailTemplateContext {
    return {
      actorName: payload.actor.name ?? payload.actor.email,
      customMessage: payload.customMessage,
      documents: payload.documents,
      additionalData: {
        subject: payload.subjectOverride,
      },
    };
  }

  mapDocuments(documents?: EmailDocumentSummary[]): EmailDocumentSummary[] | undefined {
    if (!documents?.length) return undefined;
    return documents.map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      status: doc.status,
      ownerEmail: doc.ownerEmail,
      createdAt: doc.createdAt,
      downloadUrl: doc.downloadUrl,
    }));
  }

  async sendEmail(
    payload: EmailSendRequest,
    options: SendOptions = {}
  ): Promise<EmailSendResult> {
    const config = resolveEmailConfig();

    if (!isEmailSendingAllowed(config)) {
      throw new EmailFeatureDisabledError();
    }

    const resolvedRecipients = this.routing.resolveRecipients({
      actorEmail: payload.actor.email,
      currentUserRecipient: {
        email: payload.actor.email,
        name: payload.actor.name ?? undefined,
        type: 'self',
      },
      requestedRecipients: payload.recipients,
      includeAdmin: options.includeAdmin ?? true,
      includeTest: options.includeTestRecipient ?? config.baseEnvironment === 'development',
    });

    if (resolvedRecipients.all.length === 0 || resolvedRecipients.primary.length === 0) {
      throw new EmailRecipientError();
    }

    const transporter = await getEmailTransport();
    if (!transporter) {
      throw new EmailTransportUnavailableError();
    }

    const template = this.getTemplate(payload.templateKey);
    const context = this.buildTemplateContext({
      ...payload,
      documents: this.mapDocuments(payload.documents),
    });

    const content = template.render(context);
    const subject = payload.subjectOverride || content.subject;

    const mailOptions: nodemailer.SendMailOptions = {
      from: getDefaultFromAddress(),
      to: resolvedRecipients.primary.map(formatAddress),
      cc: resolvedRecipients.cc.length
        ? resolvedRecipients.cc.map(formatAddress)
        : undefined,
      bcc: resolvedRecipients.bcc.length
        ? resolvedRecipients.bcc.map(formatAddress)
        : undefined,
      subject,
      text: content.text,
      html: content.html,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      logger.email.info(
        {
          messageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected,
          envelope: result.envelope,
          template: template.key,
        },
        'Email sent successfully'
      );

      const previewResult = nodemailer.getTestMessageUrl?.(result);
      const previewUrl = typeof previewResult === 'string' ? previewResult : undefined;

      return {
        success: true,
        messageId: result.messageId,
        accepted: Array.isArray(result.accepted)
          ? (result.accepted as string[])
          : undefined,
        rejected: Array.isArray(result.rejected)
          ? (result.rejected as string[])
          : undefined,
        envelope: result.envelope,
        previewUrl,
      };
    } catch (error) {
      logger.email.error(
        error instanceof Error ? error : new Error('Email send failed'),
        'Failed to send email'
      );
      resetEmailTransport();
      throw error;
    }
  }
}

export const emailService = new EmailService();
