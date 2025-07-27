'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, PageTitle } from '@/components/ui';
import { AlertCircle, CheckCircle, Clock, FileText, Star, ArrowRight } from 'lucide-react';
import { LoadingSpinner, LoadingButton } from '@/components/ui/loading';
import { PageContainer } from '@/components/page-container';
import { AuthGuard, useAuth } from '@/components/auth-guard';
import { StringUtils, UrlBuilder, ResponseUtils, StatusStyles } from '@/lib/utils';
import { toast } from '@/lib/utils/toast';
import { ClientLogger } from '@/lib/services/logger';
import { NDADocument, ComparisonResult, Comparison } from '@/types/nda';
import { useApiData, useApiCall } from '@/lib/hooks';

// Using NDADocument directly since this page doesn't need UI-specific fields
type Document = NDADocument;

export default function ComparePage() {
  const { session } = useAuth();
  const [selectedStandard, setSelectedStandard] = useState<string>('');
  const [selectedThirdParty, setSelectedThirdParty] = useState<string>('');
  const [currentComparison, setCurrentComparison] = useState<Comparison | null>(null);
  const [recentComparisons, setRecentComparisons] = useState<Comparison[]>([]);

  // Use consolidated API data hook for documents
  const { data: documents } = useApiData<NDADocument[]>('/${PROJECT_NAME}/api/documents', {
    autoLoad: !!session,
    initialData: [],
    transform: (response) => ResponseUtils.extractList(response),
    deps: [session]
  });

  // Use centralized API call hook for comparison (DRY: eliminates ~15 lines of fetch + error handling)
  const { apiCall, loading: comparing } = useApiCall();
  
  const startComparison = async (standardDocId: string, thirdPartyDocId: string) => {
    try {
      const response = await apiCall(UrlBuilder.apiEndpoint('api/compare'), {
        method: 'POST',
        body: JSON.stringify({ standardDocId, thirdPartyDocId })
      }, 'document comparison');
      
      const comparisonData = ResponseUtils.extractData(response);
      setCurrentComparison(comparisonData);
      setRecentComparisons(prev => [comparisonData, ...prev.slice(0, 4)]);
    } catch (error) {
      ClientLogger.apiError('document comparison', error);
      toast.error.compare(error instanceof Error ? error.message : 'Unknown error');
    }
  };
  
  const handleStartComparison = () => {
    if (selectedStandard && selectedThirdParty) {
      setCurrentComparison(null);
      startComparison(selectedStandard, selectedThirdParty);
    }
  };

  const standardDocuments = documents?.filter(doc => doc.is_standard) || [];
  const thirdPartyDocuments = documents?.filter(doc => !doc.is_standard) || [];

  // Use centralized status styling utilities
  const getRiskIcon = (risk: string) => {
    const iconConfig = StatusStyles.getRiskIcon(risk);
    switch (iconConfig.type) {
      case 'CheckCircle': return <CheckCircle className={iconConfig.className} />;
      case 'Clock': return <Clock className={iconConfig.className} />;
      case 'AlertCircle': return <AlertCircle className={iconConfig.className} />;
      default: return <Clock className={iconConfig.className} />;
    }
  };

  return (
    <AuthGuard 
      title="Document Comparison" 
      message="Please sign in to compare documents."
    >
      <PageContainer className="space-y-8">
      <PageTitle>Compare NDAs</PageTitle>

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
                  <SelectValue placeholder="Choose your standard NDA template" />
                </SelectTrigger>
                <SelectContent>
                  {standardDocuments.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {doc.original_name || StringUtils.getFilenameFromPath(doc.filename)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {standardDocuments.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  No standard templates found. Upload an NDA and mark it as standard in the Documents page.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Third-Party NDA
              </label>
              <Select value={selectedThirdParty} onValueChange={setSelectedThirdParty}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose third-party NDA to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {thirdPartyDocuments.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id.toString()}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        {doc.original_name || StringUtils.getFilenameFromPath(doc.filename)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {thirdPartyDocuments.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  No third-party documents found. Upload some NDAs to compare.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <LoadingButton
              onClick={handleStartComparison}
              disabled={!selectedStandard || !selectedThirdParty}
              loading={comparing}
              loadingText="Analyzing Documents..."
              size="lg"
              className="px-8"
            >
              Compare Documents
              <ArrowRight className="ml-2 h-4 w-4" />
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      {/* Current Comparison Results */}
      {currentComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Comparison Results
              <Badge className={StatusStyles.getRiskColor(currentComparison.result.overallRisk)}>
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
                        <Badge className={StatusStyles.getRiskColor(section.severity)}>
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
                        {comparison.standardDocument.original_name || StringUtils.getFilenameFromPath(comparison.standardDocument.filename)}
                      </span>
                      <span className="text-gray-500 mx-2">vs</span>
                      <span className="font-medium">
                        {comparison.thirdPartyDocument.original_name || StringUtils.getFilenameFromPath(comparison.thirdPartyDocument.filename)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={StatusStyles.getRiskColor(comparison.result.overallRisk)}>
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