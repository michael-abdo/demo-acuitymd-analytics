'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Trash2, Star, Download } from 'lucide-react';

interface Document {
  id: number;
  filename: string;
  display_name?: string;
  file_size: number;
  content_type: string;
  is_standard: boolean;
  status: string;
  uploaded_at: string;
  downloadUrl?: string;
}

export default function DocumentsPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load documents on page load
  useEffect(() => {
    if (session) {
      loadDocuments();
    }
  }, [session]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('isStandard', 'false');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // Reload documents to show the new upload
        await loadDocuments();
        // Clear the input
        event.target.value = '';
      } else {
        console.error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const toggleStandardTemplate = async (documentId: number, currentStatus: boolean) => {
    try {
      if (!currentStatus) {
        // Setting as standard
        const response = await fetch(`/api/documents/${documentId}/set-standard`, {
          method: 'POST',
        });
        if (response.ok) {
          await loadDocuments();
        }
      } else {
        // Removing standard status - would need to implement this endpoint
        console.log('Remove standard status not implemented yet');
      }
    } catch (error) {
      console.error('Error updating standard status:', error);
    }
  };

  const deleteDocument = async (documentId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadDocuments();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const standardDocuments = filteredDocuments.filter(doc => doc.is_standard);
  const thirdPartyDocuments = filteredDocuments.filter(doc => !doc.is_standard);

  if (!session) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>Document Library</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please sign in to manage your documents.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Document Library</h1>
        <div className="flex gap-4">
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <Button 
              asChild 
              disabled={uploading}
              className="cursor-pointer"
            >
              <label htmlFor="file-upload">
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload NDA'}
              </label>
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading documents...</div>
      ) : (
        <div className="space-y-8">
          {/* Standard Templates Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Standard Templates ({standardDocuments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {standardDocuments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No standard templates yet. Upload an NDA and mark it as a standard template.
                </p>
              ) : (
                <div className="grid gap-4">
                  {standardDocuments.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      onToggleStandard={() => toggleStandardTemplate(doc.id, doc.is_standard)}
                      onDelete={() => deleteDocument(doc.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Third-Party Documents Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Third-Party NDAs ({thirdPartyDocuments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {thirdPartyDocuments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No third-party documents yet. Upload NDAs to compare against your standards.
                </p>
              ) : (
                <div className="grid gap-4">
                  {thirdPartyDocuments.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      onToggleStandard={() => toggleStandardTemplate(doc.id, doc.is_standard)}
                      onDelete={() => deleteDocument(doc.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

interface DocumentCardProps {
  document: Document;
  onToggleStandard: () => void;
  onDelete: () => void;
}

function DocumentCard({ document, onToggleStandard, onDelete }: DocumentCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center gap-4">
        <FileText className="h-8 w-8 text-blue-500" />
        <div>
          <h3 className="font-medium">
            {document.display_name || document.filename}
          </h3>
          <p className="text-sm text-gray-500">
            {formatFileSize(document.file_size)} • {formatDate(document.uploaded_at)}
          </p>
          <div className="flex gap-2 mt-1">
            {document.is_standard && (
              <Badge variant="secondary" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Standard Template
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {document.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {document.downloadUrl && (
          <Button variant="ghost" size="sm" asChild>
            <a href={document.downloadUrl} download>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleStandard}
          className={document.is_standard ? 'text-yellow-600' : 'text-gray-600'}
        >
          <Star className={`h-4 w-4 ${document.is_standard ? 'fill-current' : ''}`} />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}