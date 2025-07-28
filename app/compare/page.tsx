'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, PageTitle } from '@/components/ui';
import { FileText, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/page-container';
import { AuthGuard, useAuth } from '@/components/auth-guard';

export default function ComparePage() {
  const { session } = useAuth();
  const [selectedStandard, setSelectedStandard] = useState<string>('');
  const [selectedThirdParty, setSelectedThirdParty] = useState<string>('');

  // Simplified compare page to avoid circular dependencies
  // In a real implementation, this would fetch documents and perform comparisons

  return (
    <AuthGuard 
      title="Document Comparison" 
      message="Please sign in to compare documents."
    >
      <PageContainer>
        <PageTitle className="mb-8">Document Comparison</PageTitle>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Document Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Select Documents to Compare
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Standard Template</label>
                <Select value={selectedStandard} onValueChange={setSelectedStandard}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your standard NDA template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder">No documents (Authentication required)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Third-Party Document</label>
                <Select value={selectedThirdParty} onValueChange={setSelectedThirdParty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select third-party document to compare" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder">No documents (Authentication required)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                disabled
                className="w-full"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Compare Documents (Authentication Required)
              </Button>
            </CardContent>
          </Card>

          {/* Results Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Comparison Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Template is ready for implementation.</p>
                <p className="text-sm">Authentication is disabled to avoid circular dependencies.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </AuthGuard>
  );
}