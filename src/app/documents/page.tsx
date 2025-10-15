'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, PageTitle } from '@/components/ui';
import { Upload, FileText, RefreshCcw, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/page-container';

type DocumentStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

interface DocumentListItem {
  id: number;
  filename: string;
  status: DocumentStatus;
  formatted_size: string;
  created_at: string;
  download_url?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
  };
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 0
};

const STATUS_OPTIONS: DocumentStatus[] = ['uploaded', 'processing', 'completed', 'failed'];

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<Record<number, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchDocuments = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      // keep success messages until data reload completes

      const query = new URLSearchParams();
      if (searchTerm.trim()) {
        query.set('search', searchTerm.trim());
      }

      try {
        const response = await fetch(`/api/documents?${query.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          signal
        });

        if (!response.ok) {
          const message = response.status === 401
            ? 'Authentication required to view documents.'
            : 'Failed to load documents.';
          throw new Error(message);
        }

        const json: ApiResponse<{ documents: DocumentListItem[]; pagination: typeof DEFAULT_PAGINATION }> =
          await response.json();

        if (!json.success || !json.data) {
          throw new Error(json.error?.message || 'Unexpected response format.');
        }

        setDocuments(json.data.documents ?? []);
        const paginationMeta = json.data.pagination ?? json.meta?.pagination ?? DEFAULT_PAGINATION;
        setPagination(paginationMeta);
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          return;
        }
        console.error('Document fetch failed', err);
        setError((err as Error).message || 'Failed to load documents.');
        setDocuments([]);
        setPagination(DEFAULT_PAGINATION);
      } finally {
        setLoading(false);
      }
    },
    [searchTerm]
  );

  useEffect(() => {
    const controller = new AbortController();
    const handle = setTimeout(() => {
      fetchDocuments(controller.signal);
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [fetchDocuments]);

  const emptyStateMessage = useMemo(() => {
    if (loading) return 'Loading documents...';
    if (error) return error;
    if (!documents.length) {
      return searchTerm.trim()
        ? 'No documents match your search.'
        : 'No documents have been uploaded yet.';
    }
    return null;
  }, [documents.length, error, loading, searchTerm]);

  const resetUploadState = () => {
    setUploadFile(null);
    setUploading(false);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploadFile(event.target.files[0]);
      setUploadError(null);
    } else {
      setUploadFile(null);
    }
  };

  const handleUpload = useCallback(async () => {
    if (uploading) return;
    setStatusMessage(null);
    setMutationError(null);
    setUploadError(null);

    if (!uploadFile) {
      setUploadError('Select a document to upload.');
      return;
    }

    setUploading(true);

    try {
      const payload = {
        filename: uploadFile.name,
        file_path: `/uploads/${Date.now()}_${uploadFile.name}`,
        file_size: uploadFile.size,
        status: 'uploaded' as DocumentStatus
      };

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let message = 'Failed to upload document.';
        try {
          const body = await response.json();
          message = body?.error?.message || message;
        } catch (err) {
          console.error('Failed to parse upload error response', err);
        }
        throw new Error(message);
      }

      await fetchDocuments();
      setStatusMessage(`Uploaded ${uploadFile.name} successfully.`);
      resetUploadState();
    } catch (err) {
      console.error('Upload failed', err);
      setUploadError((err as Error).message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  }, [fetchDocuments, uploadFile, uploading]);

  const setDocumentPending = (id: number, pending: boolean) => {
    setPendingDocuments((prev) => {
      if (pending) {
        return { ...prev, [id]: true };
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleStatusChange = useCallback(
    async (id: number, nextStatus: DocumentStatus) => {
      setStatusMessage(null);
      setMutationError(null);
      setDocumentPending(id, true);

      try {
        const response = await fetch(`/api/documents/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus })
        });

        if (!response.ok) {
          let message = 'Failed to update document.';
          try {
            const body = await response.json();
            message = body?.error?.message || message;
          } catch (err) {
            console.error('Failed to parse update error response', err);
          }
          throw new Error(message);
        }

        await fetchDocuments();
        setStatusMessage('Document updated successfully.');
      } catch (err) {
        console.error('Update failed', err);
        setMutationError((err as Error).message || 'Failed to update document.');
      } finally {
        setDocumentPending(id, false);
      }
    },
    [fetchDocuments]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      setStatusMessage(null);
      setMutationError(null);
      setDocumentPending(id, true);

      try {
        const response = await fetch(`/api/documents/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          let message = 'Failed to delete document.';
          try {
            const body = await response.json();
            message = body?.error?.message || message;
          } catch (err) {
            console.error('Failed to parse delete error response', err);
          }
          throw new Error(message);
        }

        await fetchDocuments();
        setStatusMessage('Document deleted successfully.');
      } catch (err) {
        console.error('Delete failed', err);
        setMutationError((err as Error).message || 'Failed to delete document.');
      } finally {
        setDocumentPending(id, false);
      }
    },
    [fetchDocuments]
  );

  const isDocumentPending = (id: number) => Boolean(pendingDocuments[id]);

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <PageTitle className="mb-0">
            Document Library
          </PageTitle>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
                aria-label="Search documents"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchDocuments()}
                disabled={loading}
                aria-label="Refresh documents list"
              >
                <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                disabled={uploading || loading}
              />
              <Button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !uploadFile}
              >
                <Upload className={`mr-2 h-4 w-4 ${uploading ? 'animate-spin' : ''}`} />
                {uploading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>
          </div>
        </div>

        {(statusMessage || uploadError || mutationError) && (
          <div>
            {statusMessage ? (
              <p className="text-sm text-green-600">{statusMessage}</p>
            ) : null}
            {uploadError ? (
              <p className="text-sm text-red-600">{uploadError}</p>
            ) : null}
            {mutationError ? (
              <p className="text-sm text-red-600">{mutationError}</p>
            ) : null}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <FileText className="h-5 w-5" />
              Your Documents
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {pagination.total} total • Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
            </div>
          </CardHeader>
          <CardContent>
            {emptyStateMessage ? (
              <p className="text-center text-muted-foreground py-8">{emptyStateMessage}</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded-md px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{doc.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        Uploaded {new Date(doc.created_at).toLocaleString()} • {doc.formatted_size}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        className="rounded-md border px-2 py-1 text-sm"
                        value={doc.status}
                        onChange={(event) => handleStatusChange(doc.id, event.target.value as DocumentStatus)}
                        disabled={isDocumentPending(doc.id) || loading}
                        aria-label={`Update status for ${doc.filename}`}
                      >
                        {STATUS_OPTIONS.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {statusOption}
                          </option>
                        ))}
                      </select>
                      {doc.download_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          disabled={isDocumentPending(doc.id)}
                        >
                          <a href={doc.download_url}>Download</a>
                        </Button>
                      ) : null}
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(doc.id)}
                        disabled={isDocumentPending(doc.id) || loading}
                        aria-label={`Delete ${doc.filename}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
