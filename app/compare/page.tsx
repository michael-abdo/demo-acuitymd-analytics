'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { AlertCircle, CheckCircle, Clock, FileText, Star, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/page-container';
import { AuthGuard, useAuth } from '@/components/auth-guard';
import { getFilenameFromPath } from '@/lib/utils';
import { apiPath } from '@/lib/utils/path-utils';
import { useApiData, useAsyncOperation } from '@/lib/hooks';

// Generic document type for comparison functionality
type Document = {
  id: string;
  filename: string;
  is_standard: boolean;
  created_at: string;
  file_size?: number;
  content_preview?: string;
};

// Comparison types
type ComparisonResult = {
  id: string;
  differences: Array<{
    type: string;
    risk: string;
    description: string;
  }>;
  suggestions: Array<{
    type: string;
    description: string;
  }>;
  actions: Array<{
    type: string;
    description: string;
  }>;
};

type Comparison = {
  id: string;
  standard_doc_id: string;
  third_party_doc_id: string;
  result: ComparisonResult;
  created_at: string;
};

export default function ComparePage() {
  const { session } = useAuth();
  const [selectedStandard, setSelectedStandard] = useState<string>('');
  const [selectedThirdParty, setSelectedThirdParty] = useState<string>('');
  const [currentComparison, setCurrentComparison] = useState<Comparison | null>(null);
  const [recentComparisons, setRecentComparisons] = useState<Comparison[]>([]);

  // Use consolidated API data hook for documents
  const { data: documents } = useApiData<Document[]>(apiPath('/documents'), {
    autoLoad: !!session,
    initialData: [],
    transform: (response) => response.data || [],
    deps: [session]
  });

  // Use async operation hook for comparison
  const { execute: startComparison, loading: comparing } = useAsyncOperation(
    async (standardDocId: string, thirdPartyDocId: string) => {
      const response = await fetch(apiPath('/compare'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ standardDocId, thirdPartyDocId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Comparison failed');
      }

      return response.json();
    },
    {
      onSuccess: (data) => {
        setCurrentComparison(data.data);
        setRecentComparisons(prev => [data.data, ...prev.slice(0, 4)]);
      },
      onError: (error) => {
        alert(`Comparison failed: ${error.message}`);
      }
    }
  );

  const handleStartComparison = async () => {
    if (!selectedStandard || !selectedThirdParty) return;
    
    setCurrentComparison(null);
    await startComparison(selectedStandard, selectedThirdParty);
  };

  const standardDocuments = documents?.filter(doc => doc.is_standard) || [];
  const thirdPartyDocuments = documents?.filter(doc => !doc.is_standard) || [];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'high': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <AuthGuard 
      title="Document Comparison" 
      message="Please sign in to compare documents."
    >
      <PageContainer className="space-y-8">
      <h1 className="text-3xl font-bold">Compare Documents</h1>

      {/* Document Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Documents to Compare</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Standard Template
              </label>
              <Select value={selectedStandard} onValueChange={setSelectedStandard}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your standard document template" />
                </SelectTrigger>
                <SelectContent>
                  {standardDocuments.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {doc.original_name || getFilenameFromPath(doc.filename)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {standardDocuments.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  No standard templates found. Upload a document and mark it as standard in the Documents page.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Third-Party Document
              </label>
              <Select value={selectedThirdParty} onValueChange={setSelectedThirdParty}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose third-party document to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {thirdPartyDocuments.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id.toString()}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        {doc.original_name || getFilenameFromPath(doc.filename)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {thirdPartyDocuments.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  No third-party documents found. Upload some documents to compare.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleStartComparison}
              disabled={!selectedStandard || !selectedThirdParty || comparing}
              size="lg"
              className="px-8"
            >
              {comparing ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Documents...
                </>
              ) : (
                <>
                  Compare Documents
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Comparison Results */}
      {currentComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Comparison Results
              <Badge className={getRiskColor(currentComparison.result.overallRisk)}>
                {getRiskIcon(currentComparison.result.overallRisk)}
                {currentComparison.result.overallRisk.toUpperCase()} RISK
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div>
              <h3 className="font-semibold mb-2">Executive Summary</h3>
              <p className="text-gray-700">{currentComparison.result.summary}</p>
            </div>

            {/* Key Differences */}
            <div>
              <h3 className="font-semibold mb-2">Key Differences</h3>
              <ul className="space-y-1">
                {currentComparison.result.keyDifferences.map((diff, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{diff}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section Analysis */}
            <div>
              <h3 className="font-semibold mb-3">Detailed Analysis by Section</h3>
              <div className="space-y-4">
                {currentComparison.result.sections.map((section, idx) => (
                  <Card key={idx} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{section.section}</CardTitle>
                        <Badge className={getRiskColor(section.severity)}>
                          {section.severity.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {section.differences.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Differences:</h4>
                          <ul className="space-y-1">
                            {section.differences.map((diff, diffIdx) => (
                              <li key={diffIdx} className="text-sm text-gray-600 ml-4">
                                • {diff}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {section.suggestions.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Recommendations:</h4>
                          <ul className="space-y-1">
                            {section.suggestions.map((suggestion, suggIdx) => (
                              <li key={suggIdx} className="text-sm text-blue-600 ml-4">
                                • {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recommended Actions */}
            <div>
              <h3 className="font-semibold mb-2">Recommended Actions</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <ul className="space-y-2">
                  {currentComparison.result.recommendedActions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-blue-800">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Confidence Score */}
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-gray-500">
                Analysis Confidence: {Math.round(currentComparison.result.confidence * 100)}%
              </span>
              <span className="text-sm text-gray-500">
                Completed: {new Date(currentComparison.completedAt || currentComparison.createdAt).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Comparisons */}
      {recentComparisons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Comparisons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentComparisons.map((comparison, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setCurrentComparison(comparison)}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm">
                      <span className="font-medium">
                        {comparison.standardDocument.original_name || getFilenameFromPath(comparison.standardDocument.filename)}
                      </span>
                      <span className="text-gray-500 mx-2">vs</span>
                      <span className="font-medium">
                        {comparison.thirdPartyDocument.original_name || getFilenameFromPath(comparison.thirdPartyDocument.filename)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRiskColor(comparison.result.overallRisk)}>
                      {comparison.result.overallRisk.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(comparison.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </PageContainer>
    </AuthGuard>
  );
}