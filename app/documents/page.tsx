'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from '@/components/ui';
import { Upload, FileText, Trash2, Star, Download } from 'lucide-react';
import { PageContainer } from '@/components/page-container';
import { AuthGuard, useAuth } from '@/components/auth-guard';
import { getFilenameFromPath } from '@/lib/utils';
import { NDADocument, DocumentWithUIFields, DocumentCardProps } from '@/types/nda';
import { useApiData, useFileUpload } from '@/lib/hooks';
import { config } from '@/lib/config';

export default function DocumentsPage() {
  const { session } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Use consolidated API data hook
  const { 
    data: documents, 
    loading, 
    error, 
    reload: loadDocuments 
  } = useApiData<DocumentWithUIFields[]>(config.template.paths.api.documents, {
    autoLoad: !!session,
    initialData: [],
    transform: (response) => response.data || [],
    deps: [session]
  });

  // Use consolidated file upload hook
  const { upload, uploading } = useFileUpload(config.template.paths.api.upload, {
    onSuccess: () => {
      loadDocuments(); // Reload documents after successful upload
    }
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('isStandard', 'false');

      await upload(formData);
      
      // Clear the input on success
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const toggleStandardTemplate = async (documentId: number, currentStatus: boolean) => {
    try {
      if (!currentStatus) {
        // Setting as standard
        const response = await fetch(`${config.template.paths.api.documents}/${documentId}/set-standard`, {
          method: 'POST',
        });
        if (response.ok) {
          await loadDocuments();
        }
      } else {
        // Removing standard status - would need to implement this endpoint
        // TODO: Implement remove standard status endpoint
      }
    } catch (error) {
      console.error('Error updating standard status:', error);
    }
  };

  const deleteDocument = async (documentId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`${config.template.paths.api.documents}/${documentId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadDocuments();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const filteredDocuments = documents?.filter(doc =>
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.original_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const standardDocuments = filteredDocuments.filter(doc => doc.is_standard);
  const thirdPartyDocuments = filteredDocuments.filter(doc => !doc.is_standard);

  return (
    <AuthGuard 
      title="Document Library" 
      message="Please sign in to manage your documents."
    >
      <PageContainer>
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
      </PageContainer>
    </AuthGuard>
  );
}

function DocumentCard({ document, onToggleStandard, onDelete }: DocumentCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center gap-4">
        <FileText className="h-8 w-8 text-blue-500" />
        <div>
          <h3 className="font-medium">
            {document.original_name || getFilenameFromPath(document.filename)}
          </h3>
          <p className="text-sm text-gray-500">
            {formatFileSize(document.file_size)} • {formatDate(document.created_at)}
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