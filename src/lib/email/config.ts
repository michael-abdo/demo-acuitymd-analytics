import appConfig from '../../../config';
import { logger } from '@/lib/pino-logger';

export interface EmailFeatureConfig {
  enabled: boolean;
  allowInDev: boolean;
  fromAddress: string;
  smtpHost?: string;
  smtpPort: number;
  smtpUsername?: string;
  smtpPassword?: string;
  baseEnvironment: 'development' | 'production' | 'test' | 'staging';
  adminEmail?: string;
  testRecipient?: string;
}

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveEmailConfig(): EmailFeatureConfig {
  const baseEnv =
    (process.env.NODE_ENV as EmailFeatureConfig['baseEnvironment']) || 'development';

  // Use optional chain because config module can be deleted in certain workspace states
  const emailNotificationsEnabled = Boolean(appConfig?.features?.emailNotifications);

  const enabledFlag = process.env.ENABLE_EMAIL === 'true' || emailNotificationsEnabled;
  const allowInDev = process.env.ENABLE_EMAIL_IN_DEV === 'true';

  const fromAddress =
    process.env.SES_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    process.env.ADMIN_EMAIL ||
    'noreply@example.com';

  const smtpHost =
    process.env.AWS_SES_SMTP_HOST ||
    process.env.EMAIL_SERVER ||
    process.env.SMTP_HOST ||
    undefined;

  const smtpPort = readNumber(
    process.env.AWS_SES_SMTP_PORT || process.env.EMAIL_PORT || process.env.SMTP_PORT,
    587
  );

  const smtpUsername =
    process.env.AWS_SES_SMTP_USERNAME ||
    process.env.EMAIL_USER ||
    process.env.SMTP_USERNAME ||
    undefined;

  const smtpPassword =
    process.env.AWS_SES_SMTP_PASSWORD ||
    process.env.EMAIL_PASSWORD ||
    process.env.SMTP_PASSWORD ||
    undefined;

  const adminEmail = process.env.ADMIN_EMAIL || undefined;
  const testRecipient = process.env.SES_TEST_RECIPIENT || process.env.TEST_EMAIL || undefined;

  return {
    enabled: enabledFlag,
    allowInDev,
    fromAddress,
    smtpHost,
    smtpPort,
    smtpUsername,
    smtpPassword,
    baseEnvironment: baseEnv,
    adminEmail,
    testRecipient,
  };
}

export function isEmailSendingAllowed(configOverride?: EmailFeatureConfig): boolean {
  const cfg = configOverride ?? resolveEmailConfig();

  if (!cfg.enabled) {
    logger.email.debug('Email feature disabled via ENABLE_EMAIL flag');
    return false;
  }

  if (cfg.baseEnvironment === 'development' && !cfg.allowInDev) {
    logger.email.info(
      'Email sending blocked in development environment (set ENABLE_EMAIL_IN_DEV=true to override)'
    );
    return false;
  }

  if (!cfg.smtpHost || !cfg.smtpUsername || !cfg.smtpPassword) {
    logger.email.warn('Email transport unavailable - missing SMTP configuration');
    return false;
  }

  return true;
}
