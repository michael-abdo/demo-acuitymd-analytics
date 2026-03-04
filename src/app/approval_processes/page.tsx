'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCsrfToken } from 'next-auth/react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, PageTitle } from '@/components/ui';
import { RefreshCcw, Plus, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/page-container';

async function getApiHeaders(): Promise<HeadersInit> {
  const csrfToken = await getCsrfToken();
  return {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken || '',
  };
}

interface ApprovalProcessItem {
  id: number;
  stage_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  responsible_person: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

export default function ApprovalProcesssPage() {
  const [items, setItems] = useState<ApprovalProcessItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [stage_name, setStageName] = useState('');
  const [start_date, setStartDate] = useState('');
  const [end_date, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [responsible_person, setResponsiblePerson] = useState('');

  const fetchItems = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);

    const query = new URLSearchParams();
    if (searchTerm.trim()) query.set('search', searchTerm.trim());

    try {
      const response = await fetch(`/api/approval_processes?${query.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal
      });

      if (!response.ok) throw new Error('Failed to load approval_processes.');

      const json: ApiResponse<{ approval_processes: ApprovalProcessItem[] }> = await response.json();
      if (!json.success || !json.data) throw new Error(json.error?.message || 'Unexpected response.');

      setItems(json.data.approval_processes ?? []);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const controller = new AbortController();
    const handle = setTimeout(() => fetchItems(controller.signal), 400);
    return () => { controller.abort(); clearTimeout(handle); };
  }, [fetchItems]);

  const handleCreate = useCallback(async () => {
    setStatusMessage(null);
    try {
      const response = await fetch('/api/approval_processes', {
        method: 'POST',
        headers: await getApiHeaders(),
        body: JSON.stringify({ stage_name, start_date, end_date, status, responsible_person })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error?.message || 'Failed to create approval_process.');
      }

      await fetchItems();
      setStatusMessage('ApprovalProcess created successfully.');
      setShowCreateForm(false);
      setStageName('');
      setStartDate('');
      setEndDate('');
      setStatus('');
      setResponsiblePerson('');
    } catch (err) {
      setStatusMessage((err as Error).message);
    }
  }, [stage_name, start_date, end_date, status, responsible_person, fetchItems]);

  const handleDelete = useCallback(async (id: number) => {
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/approval_processes/${id}`, {
        method: 'DELETE',
        headers: await getApiHeaders()
      });

      if (!response.ok) throw new Error('Failed to delete approval_process.');

      await fetchItems();
      setStatusMessage('ApprovalProcess deleted successfully.');
    } catch (err) {
      setStatusMessage((err as Error).message);
    }
  }, [fetchItems]);

  const emptyMessage = useMemo(() => {
    if (loading) return 'Loading...';
    if (!items.length) return searchTerm.trim() ? 'No results.' : 'No approval_processes yet. Connect a database and run seed to populate.';
    return null;
  }, [items.length, loading, searchTerm]);

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <PageTitle className="mb-0">ApprovalProcesss</PageTitle>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Button variant="outline" onClick={() => fetchItems()} disabled={loading}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          </div>
        </div>

        {statusMessage && <p className="text-sm text-green-600">{statusMessage}</p>}

        {showCreateForm && (
          <Card>
            <CardHeader><CardTitle>New ApprovalProcess</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Input
                placeholder="Stage Name"
                value={stage_name}
                onChange={(e) => setStageName(e.target.value)}
              />
              <Input
                placeholder="Start Date"
                value={start_date}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                placeholder="End Date"
                value={end_date}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <Input
                placeholder="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
              <Input
                placeholder="Responsible Person"
                value={responsible_person}
                onChange={(e) => setResponsiblePerson(e.target.value)}
              />
              <Button onClick={handleCreate}>Create</Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">ApprovalProcesss</CardTitle>
          </CardHeader>
          <CardContent>
            {emptyMessage ? (
              <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded-md px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{item.stage_name}</p>
                      <p className="text-sm text-muted-foreground">{item.status}</p>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
