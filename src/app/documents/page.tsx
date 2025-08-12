'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, PageTitle } from '@/components/ui';
import { Upload, FileText, Star } from 'lucide-react';
import { PageContainer } from '@/components/page-container';

export default function DocumentsPage() {
  // TODO: Authentication will be handled at page level
  const [searchTerm, setSearchTerm] = useState('');

  // Simplified documents page to avoid circular dependencies
  // In a real implementation, this would fetch and manage documents

  return (
    <PageContainer>
        <div className="flex justify-between items-center mb-8">
          <PageTitle className="mb-0">Document Library</PageTitle>
          <div className="flex gap-4">
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Button disabled>
              <Upload className="mr-2 h-4 w-4" />
              Upload Template (Authentication Required)
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Standard Templates Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Standard Templates (0)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-4">
                Template is ready for implementation. Authentication is disabled to avoid circular dependencies.
              </p>
            </CardContent>
          </Card>

          {/* Third-Party Documents Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Third-Party Templates (0)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-4">
                Template is ready for implementation. Authentication is disabled to avoid circular dependencies.
              </p>
            </CardContent>
          </Card>
        </div>
    </PageContainer>
  );
}