'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestAPIPage() {
  const { data: session } = useSession();
  const [results, setResults] = useState<any[]>([]);
  const [uploadedDocId, setUploadedDocId] = useState<number | null>(null);

  const addResult = (test: string, result: any) => {
    setResults(prev => [...prev, { test, result, timestamp: new Date().toISOString() }]);
  };

  // Test 1: List Documents
  const testListDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      addResult('List Documents', { status: response.status, data });
    } catch (error: any) {
      addResult('List Documents', { error: error.message });
    }
  };

  // Test 2: Upload Document
  const testUploadDocument = async () => {
    try {
      // Create a test file
      const testContent = 'This is a test NDA document for testing purposes.';
      const blob = new Blob([testContent], { type: 'text/plain' });
      const file = new File([blob], 'test-nda.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('isStandard', 'false');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.document?.id) {
        setUploadedDocId(data.document.id);
      }
      addResult('Upload Document', { status: response.status, data });
    } catch (error: any) {
      addResult('Upload Document', { error: error.message });
    }
  };

  // Test 3: Get Document Details
  const testGetDocument = async () => {
    const docId = uploadedDocId || 1;
    try {
      const response = await fetch(`/api/documents/${docId}`);
      const data = await response.json();
      addResult(`Get Document #${docId}`, { status: response.status, data });
    } catch (error: any) {
      addResult(`Get Document #${docId}`, { error: error.message });
    }
  };

  // Test 4: Set Document as Standard
  const testSetStandard = async () => {
    const docId = uploadedDocId || 1;
    try {
      const response = await fetch(`/api/documents/${docId}/set-standard`, {
        method: 'POST',
      });
      const data = await response.json();
      addResult(`Set Standard #${docId}`, { status: response.status, data });
    } catch (error: any) {
      addResult(`Set Standard #${docId}`, { error: error.message });
    }
  };

  // Test 5: Update Document
  const testUpdateDocument = async () => {
    const docId = uploadedDocId || 1;
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: 'Updated Test Document' }),
      });
      const data = await response.json();
      addResult(`Update Document #${docId}`, { status: response.status, data });
    } catch (error: any) {
      addResult(`Update Document #${docId}`, { error: error.message });
    }
  };

  // Test 6: Delete Document
  const testDeleteDocument = async () => {
    const docId = uploadedDocId || 1;
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      addResult(`Delete Document #${docId}`, { status: response.status, data });
    } catch (error: any) {
      addResult(`Delete Document #${docId}`, { error: error.message });
    }
  };

  // Test 7: Storage Health
  const testStorageHealth = async () => {
    try {
      const response = await fetch('/api/storage-health');
      const data = await response.json();
      addResult('Storage Health', { status: response.status, data });
    } catch (error: any) {
      addResult('Storage Health', { error: error.message });
    }
  };

  if (!session) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>API Test Suite</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please sign in to test the APIs.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>NDA API Test Suite</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Signed in as: {session.user?.email}</p>
          
          <div className="space-y-2 mb-6">
            <Button onClick={testListDocuments} className="mr-2">
              Test List Documents
            </Button>
            <Button onClick={testUploadDocument} className="mr-2">
              Test Upload
            </Button>
            <Button onClick={testGetDocument} className="mr-2">
              Test Get Document
            </Button>
            <Button onClick={testSetStandard} className="mr-2">
              Test Set Standard
            </Button>
            <Button onClick={testUpdateDocument} className="mr-2">
              Test Update
            </Button>
            <Button onClick={testDeleteDocument} className="mr-2">
              Test Delete
            </Button>
            <Button onClick={testStorageHealth} className="mr-2">
              Test Storage Health
            </Button>
            <Button 
              onClick={() => setResults([])} 
              variant="outline"
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {results.map((result, idx) => (
          <Card key={idx}>
            <CardHeader>
              <CardTitle className="text-lg">{result.test}</CardTitle>
              <p className="text-sm text-gray-500">{result.timestamp}</p>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-xs">
                {JSON.stringify(result.result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}