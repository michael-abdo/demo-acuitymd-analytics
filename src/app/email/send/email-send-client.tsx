'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmailPreview } from './email-preview';
import { EmailDocumentSummary, EmailRecipient } from '@/lib/email/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
  };
}

interface DocumentsResponse {
  documents: Array<{
    id: number;
    filename: string;
    status: string;
    formatted_size: string;
    created_at: string;
    user_id: string;
  }>;
}

interface RecipientResponse {
  feature: {
    enabled: boolean;
    fromAddress: string;
    adminEmail?: string;
    testRecipient?: string;
  };
  recipients: EmailRecipient[];
  documents: EmailDocumentSummary[];
}

function dedupeRecipients(recipients: EmailRecipient[]): EmailRecipient[] {
  const map = new Map<string, EmailRecipient>();
  recipients.forEach((recipient) => {
    if (!recipient?.email) return;
    const key = recipient.email.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        ...recipient,
        email: key,
      });
    }
  });
  return Array.from(map.values());
}

function formatDate(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return timestamp;
  }
}

export default function EmailSendClient() {
  const [documents, setDocuments] = useState<DocumentsResponse['documents']>([]);
  const [documentLoading, setDocumentLoading] = useState(true);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);

  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [fromAddress, setFromAddress] = useState('noreply@example.com');
  const [adminRecipientAvailable, setAdminRecipientAvailable] = useState(false);
  const [testRecipientAvailable, setTestRecipientAvailable] = useState(false);
  const [includeAdmin, setIncludeAdmin] = useState(true);
  const [includeTestRecipient, setIncludeTestRecipient] = useState(false);

  const [suggestedRecipients, setSuggestedRecipients] = useState<EmailRecipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<EmailRecipient[]>([]);
  const [manualRecipient, setManualRecipient] = useState('');

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusVariant, setStatusVariant] = useState<'success' | 'error' | 'info'>('info');
  const [sending, setSending] = useState(false);
  const [recipientsLoading, setRecipientsLoading] = useState(false);

  const selectedDocuments = useMemo(() => {
    if (selectedDocumentIds.length === 0) return documents;
    return documents.filter((doc) => selectedDocumentIds.includes(doc.id));
  }, [documents, selectedDocumentIds]);

  const loadDocuments = useCallback(async () => {
    try {
      setDocumentLoading(true);
      const response = await fetch('/api/documents', { method: 'GET' });
      const json = (await response.json()) as ApiResponse<DocumentsResponse>;
      if (json.success) {
        setDocuments(json.data.documents);
      } else {
        setStatusMessage(json.error?.message ?? 'Failed to load documents');
        setStatusVariant('error');
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Unexpected error loading documents'
      );
      setStatusVariant('error');
    } finally {
      setDocumentLoading(false);
    }
  }, []);

  const loadRecipients = useCallback(async () => {
    try {
      setRecipientsLoading(true);
      const response = await fetch('/api/email/recipients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds: selectedDocumentIds,
          includeAdmin,
          includeTestRecipient,
        }),
      });

      const json = (await response.json()) as ApiResponse<RecipientResponse>;
      if (!json.success) {
        setStatusMessage(json.error?.message ?? 'Unable to resolve recipients');
        setStatusVariant('error');
        return;
      }

      const { feature, recipients } = json.data;
      setFeatureEnabled(feature.enabled);
      setFromAddress(feature.fromAddress || 'noreply@example.com');
      setAdminRecipientAvailable(Boolean(feature.adminEmail));
      setTestRecipientAvailable(Boolean(feature.testRecipient));
      setIncludeAdmin((previous) => (feature.adminEmail ? previous : false));
      setIncludeTestRecipient((previous) => (feature.testRecipient ? previous : false));
      setSuggestedRecipients(recipients);

      setSelectedRecipients((previous) => {
        const manualOnly = previous.filter(
          (recipient) => !recipients.some((item) => item.email === recipient.email)
        );
        return dedupeRecipients([...recipients, ...manualOnly]);
      });
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Unexpected error loading recipients'
      );
      setStatusVariant('error');
    } finally {
      setRecipientsLoading(false);
    }
  }, [selectedDocumentIds, includeAdmin, includeTestRecipient]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  const toggleDocumentSelection = (documentId: number) => {
    setSelectedDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    );
  };

  const toggleRecipient = (email: string) => {
    setSelectedRecipients((current) => {
      const exists = current.some((recipient) => recipient.email === email);
      if (exists) {
        return current.filter((recipient) => recipient.email !== email);
      }
      const suggestion = suggestedRecipients.find((recipient) => recipient.email === email);
      return dedupeRecipients([...current, suggestion ?? { email }]);
    });
  };

  const addManualRecipient = () => {
    const trimmed = manualRecipient.trim();
    if (!trimmed) return;
    setSelectedRecipients((current) =>
      dedupeRecipients([
        ...current,
        {
          email: trimmed.toLowerCase(),
          reason: 'Added manually',
        },
      ])
    );
    setManualRecipient('');
  };

  const removeManualRecipient = (email: string) => {
    setSelectedRecipients((current) => current.filter((recipient) => recipient.email !== email));
  };

  const handleSendEmail = async () => {
    setStatusMessage(null);
    if (!featureEnabled) {
      setStatusMessage('Email feature is disabled. Update your environment configuration.');
      setStatusVariant('error');
      return;
    }

    if (selectedRecipients.length === 0) {
      setStatusMessage('Please select at least one recipient before sending.');
      setStatusVariant('error');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: selectedRecipients,
          documentIds: selectedDocumentIds,
          message,
          subject,
          includeAdmin,
          includeTestRecipient,
        }),
      });

      const json = await response.json();
      if (json.success) {
        setStatusMessage('Email submitted for delivery.');
        setStatusVariant('success');
      } else {
        setStatusMessage(json.error?.message ?? 'Unable to send email');
        setStatusVariant('error');
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Unexpected error while sending email'
      );
      setStatusVariant('error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-6 pb-12">
      <Card>
        <CardHeader>
          <CardTitle>Send Document Emails</CardTitle>
          <CardDescription>
            Draft, preview, and send document notifications to project stakeholders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {statusMessage && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                statusVariant === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : statusVariant === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              {statusMessage}
            </div>
          )}

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Documents</h3>
                <p className="text-sm text-slate-500">
                  Select the documents you want to reference in your message.
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white">
                {documentLoading ? (
                  <div className="p-4 text-sm text-slate-500">Loading documents...</div>
                ) : documents.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">
                    No documents found. Upload documents before sending notifications.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {documents.map((document) => {
                      const selected = selectedDocumentIds.includes(document.id);
                      return (
                        <li key={document.id}>
                          <label className="flex cursor-pointer items-start gap-3 p-4">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                              checked={selected}
                              onChange={() => toggleDocumentSelection(document.id)}
                            />
                            <div className="space-y-1">
                              <p className="font-medium text-slate-900">{document.filename}</p>
                              <p className="text-xs text-slate-500">
                                {document.formatted_size} •{' '}
                                {document.status ? document.status.toUpperCase() : 'UNKNOWN'} •{' '}
                                {formatDate(document.created_at)}
                              </p>
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Recipients</h3>
                <p className="text-sm text-slate-500">
                  Choose who should receive this notification. Add manual recipients as needed.
                </p>
              </div>

              <div className="rounded-md border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      checked={includeAdmin}
                      disabled={!featureEnabled || !adminRecipientAvailable}
                      onChange={(event) => setIncludeAdmin(event.target.checked)}
                    />
                    <span className="text-sm text-slate-600">Include admin recipient</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      checked={includeTestRecipient}
                      disabled={!featureEnabled || !testRecipientAvailable}
                      onChange={(event) => setIncludeTestRecipient(event.target.checked)}
                    />
                    <span className="text-sm text-slate-600">Include test recipient</span>
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-200">
                  {recipientsLoading ? (
                    <div className="p-4 text-sm text-slate-500">Resolving recipients…</div>
                  ) : suggestedRecipients.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">
                      No suggested recipients. Add recipients manually below.
                    </div>
                  ) : (
                    suggestedRecipients.map((recipient) => {
                      const selected = selectedRecipients.some(
                        (item) => item.email === recipient.email
                      );
                      return (
                        <label
                          key={recipient.email}
                          className="flex cursor-pointer items-start gap-3 p-4"
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                            checked={selected}
                            onChange={() => toggleRecipient(recipient.email)}
                          />
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900">{recipient.email}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              {recipient.type && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 uppercase tracking-wide text-slate-600">
                                  {recipient.type}
                                </span>
                              )}
                              {recipient.reason && <span>{recipient.reason}</span>}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-slate-200 p-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add recipient email"
                      value={manualRecipient}
                      onChange={(event) => setManualRecipient(event.target.value)}
                    />
                    <Button type="button" variant="secondary" onClick={addManualRecipient}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipients
                      .filter(
                        (recipient) =>
                          !suggestedRecipients.some((item) => item.email === recipient.email)
                      )
                      .map((recipient) => (
                        <span
                          key={recipient.email}
                          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          {recipient.email}
                          <button
                            type="button"
                            className="ml-2 text-slate-500 hover:text-slate-700"
                            onClick={() => removeManualRecipient(recipient.email)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">Subject</label>
                <Input
                  placeholder="Document notification"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  disabled={!featureEnabled}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">From address</label>
                <Input value={fromAddress} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">Message</label>
              <Textarea
                rows={6}
                placeholder="Share context for these documents…"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={!featureEnabled}
              />
              <p className="text-xs text-slate-500">
                Plain text is supported. Line breaks will be preserved in the email body.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={loadRecipients}>
                Refresh Recipients
              </Button>
              <Button
                type="button"
                onClick={handleSendEmail}
                disabled={sending || !featureEnabled}
              >
                {sending ? 'Sending…' : 'Send Email'}
              </Button>
            </div>
          </section>
        </CardContent>
      </Card>

      <EmailPreview
        subject={subject}
        message={message}
        recipients={selectedRecipients}
        documents={selectedDocuments}
      />
    </div>
  );
}
