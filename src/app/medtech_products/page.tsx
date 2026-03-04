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

interface MedtechProductItem {
  id: number;
  product_name: string;
  approval_date: string;
  market_region: string;
  units_sold: number;
  fda_status: string;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

export default function MedtechProductsPage() {
  const [items, setItems] = useState<MedtechProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [product_name, setProductName] = useState('');
  const [approval_date, setApprovalDate] = useState('');
  const [market_region, setMarketRegion] = useState('');
  const [units_sold, setUnitsSold] = useState(0);
  const [fda_status, setFdaStatus] = useState('');

  const fetchItems = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);

    const query = new URLSearchParams();
    if (searchTerm.trim()) query.set('search', searchTerm.trim());

    try {
      const response = await fetch(`/api/medtech_products?${query.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal
      });

      if (!response.ok) throw new Error('Failed to load medtech_products.');

      const json: ApiResponse<{ medtech_products: MedtechProductItem[] }> = await response.json();
      if (!json.success || !json.data) throw new Error(json.error?.message || 'Unexpected response.');

      setItems(json.data.medtech_products ?? []);
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
      const response = await fetch('/api/medtech_products', {
        method: 'POST',
        headers: await getApiHeaders(),
        body: JSON.stringify({ product_name, approval_date, market_region, units_sold, fda_status })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error?.message || 'Failed to create medtech_product.');
      }

      await fetchItems();
      setStatusMessage('MedtechProduct created successfully.');
      setShowCreateForm(false);
      setProductName('');
      setApprovalDate('');
      setMarketRegion('');
      setUnitsSold(0);
      setFdaStatus('');
    } catch (err) {
      setStatusMessage((err as Error).message);
    }
  }, [product_name, approval_date, market_region, units_sold, fda_status, fetchItems]);

  const handleDelete = useCallback(async (id: number) => {
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/medtech_products/${id}`, {
        method: 'DELETE',
        headers: await getApiHeaders()
      });

      if (!response.ok) throw new Error('Failed to delete medtech_product.');

      await fetchItems();
      setStatusMessage('MedtechProduct deleted successfully.');
    } catch (err) {
      setStatusMessage((err as Error).message);
    }
  }, [fetchItems]);

  const emptyMessage = useMemo(() => {
    if (loading) return 'Loading...';
    if (!items.length) return searchTerm.trim() ? 'No results.' : 'No medtech_products yet. Connect a database and run seed to populate.';
    return null;
  }, [items.length, loading, searchTerm]);

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <PageTitle className="mb-0">MedtechProducts</PageTitle>
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
            <CardHeader><CardTitle>New MedtechProduct</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Input
                placeholder="Product Name"
                value={product_name}
                onChange={(e) => setProductName(e.target.value)}
              />
              <Input
                placeholder="Approval Date"
                value={approval_date}
                onChange={(e) => setApprovalDate(e.target.value)}
              />
              <Input
                placeholder="Market Region"
                value={market_region}
                onChange={(e) => setMarketRegion(e.target.value)}
              />
              <Input
                placeholder="Units Sold"
                value={units_sold}
                onChange={(e) => setUnitsSold(Number(e.target.value) || 0)}
              />
              <Input
                placeholder="Fda Status"
                value={fda_status}
                onChange={(e) => setFdaStatus(e.target.value)}
              />
              <Button onClick={handleCreate}>Create</Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">MedtechProducts</CardTitle>
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
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">{item.market_region}</p>
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
