import { EmailDocumentSummary, EmailRecipient } from '@/lib/email/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EmailPreviewProps {
  subject: string;
  message: string;
  recipients: EmailRecipient[];
  documents: EmailDocumentSummary[];
}

export function EmailPreview({ subject, message, recipients, documents }: EmailPreviewProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Email Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-700">
        <div>
          <span className="font-semibold text-slate-900">Subject:</span>{' '}
          <span>{subject || 'Document Notification'}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-900">Recipients:</span>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {recipients.length === 0 ? (
              <li className="text-slate-500">No recipients selected</li>
            ) : (
              recipients.map((recipient) => (
                <li key={recipient.email}>
                  <span className="font-medium text-slate-900">{recipient.email}</span>
                  {recipient.type && (
                    <span className="ml-2 uppercase text-xs tracking-wide text-slate-500">
                      {recipient.type}
                    </span>
                  )}
                  {recipient.reason && (
                    <span className="ml-2 text-slate-500 italic">{recipient.reason}</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <span className="font-semibold text-slate-900">Message:</span>
          <p className="mt-2 whitespace-pre-wrap border border-slate-200 rounded-md p-3 bg-slate-50">
            {message || 'No additional message provided.'}
          </p>
        </div>
        <div>
          <span className="font-semibold text-slate-900">Documents:</span>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {documents.length === 0 ? (
              <li className="text-slate-500">No documents selected</li>
            ) : (
              documents.map((doc) => (
                <li key={doc.id}>
                  <span className="font-medium text-slate-900">{doc.filename}</span>
                  {doc.status && (
                    <span className="ml-2 text-xs uppercase tracking-wide text-slate-500">
                      {doc.status}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
