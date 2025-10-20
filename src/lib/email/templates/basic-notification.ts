import { EmailTemplate, EmailTemplateContext, EmailTemplateContent } from '../types';

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderDocumentsList(context: EmailTemplateContext): string {
  if (!context.documents?.length) {
    return '<p>No documents were specified.</p>';
  }

  const items = context.documents
    .map((doc) => {
      const status = doc.status ? ` — status: ${escapeHtml(doc.status)}` : '';
      return `<li><strong>${escapeHtml(doc.filename)}</strong>${status}</li>`;
    })
    .join('');

  return `<ul>${items}</ul>`;
}

function buildHtml(context: EmailTemplateContext): string {
  const greeting = context.actorName
    ? `${escapeHtml(context.actorName)} has shared the following update:`
    : 'An update is available:';

  const message = context.customMessage
    ? `<p>${context.customMessage.split('\n').map(escapeHtml).join('<br/>')}</p>`
    : '<p>No additional message provided.</p>';

  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a;">
      <h1 style="font-size: 20px; margin-bottom: 12px;">Document Notification</h1>
      <p style="margin-bottom: 12px;">${greeting}</p>
      ${message}
      <h2 style="font-size: 16px; margin-top: 20px;">Documents</h2>
      ${renderDocumentsList(context)}
      <p style="font-size: 12px; color: #475569; margin-top: 24px;">
        You are receiving this email because email notifications are enabled in the VVG template.
      </p>
    </div>
  `;
}

function buildText(context: EmailTemplateContext): string {
  const lines: string[] = [];
  lines.push('Document Notification');
  lines.push('---------------------');
  if (context.actorName) {
    lines.push(`${context.actorName} has shared the following update:`);
  }
  if (context.customMessage) {
    lines.push('');
    lines.push(context.customMessage);
  }
  if (context.documents?.length) {
    lines.push('');
    lines.push('Documents:');
    context.documents.forEach((doc) => {
      const status = doc.status ? ` (status: ${doc.status})` : '';
      lines.push(` • ${doc.filename}${status}`);
    });
  }
  lines.push('');
  lines.push('You are receiving this email because email notifications are enabled in the VVG template.');
  return lines.join('\n');
}

function render(context: EmailTemplateContext): EmailTemplateContent {
  return {
    subject: context.additionalData?.subject
      ? String(context.additionalData.subject)
      : 'Document Notification',
    html: buildHtml(context),
    text: buildText(context),
  };
}

export const basicNotificationTemplate: EmailTemplate<EmailTemplateContext> = {
  key: 'basic-document-notification',
  name: 'Basic Document Notification',
  description: 'Generic email template for document-related notifications.',
  render,
};
