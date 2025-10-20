import nodemailer, { SentMessageInfo, Transporter } from 'nodemailer';
import { logger } from '@/lib/pino-logger';
import { isEmailSendingAllowed, resolveEmailConfig } from './config';

let cachedTransport: Transporter | null = null;
let configSnapshot = resolveEmailConfig();

export type SendMail = (mailOptions: nodemailer.SendMailOptions) => Promise<SentMessageInfo>;

export async function getEmailTransport(): Promise<Transporter | null> {
  configSnapshot = resolveEmailConfig();

  if (!isEmailSendingAllowed(configSnapshot)) {
    return null;
  }

  if (cachedTransport) {
    return cachedTransport;
  }

  try {
    cachedTransport = nodemailer.createTransport({
      host: configSnapshot.smtpHost,
      port: configSnapshot.smtpPort,
      secure: configSnapshot.smtpPort === 465,
      auth: {
        user: configSnapshot.smtpUsername,
        pass: configSnapshot.smtpPassword,
      },
    });

    await cachedTransport.verify();
    logger.email.info('Email transport initialized');
    return cachedTransport;
  } catch (error) {
    logger.email.error(
      error instanceof Error ? error : new Error('Unable to initialize email transport'),
      'Failed to verify SMTP transport'
    );
    cachedTransport = null;
    return null;
  }
}

export function resetEmailTransport(): void {
  cachedTransport = null;
}

export function getDefaultFromAddress(): string {
  const cfg = configSnapshot ?? resolveEmailConfig();
  return cfg.fromAddress;
}
