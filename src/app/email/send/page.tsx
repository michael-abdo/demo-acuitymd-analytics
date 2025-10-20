import type { Metadata } from 'next';
import EmailSendClient from './email-send-client';

export const metadata: Metadata = {
  title: 'Email Notifications',
  description: 'Preview and send document email notifications from the template.',
};

export default function EmailSendPage() {
  return <EmailSendClient />;
}
