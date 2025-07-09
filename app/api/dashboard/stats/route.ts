export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server';
import { withAuth, ApiResponse } from '@/lib/auth-utils';
import { ApiErrors } from '@/lib/utils';
import { documentDb, comparisonDb } from '@/lib/nda/database';
import { DocumentStatus, ComparisonStatus } from '@/types/nda';
import { DashboardStats, DashboardStatsResponse } from '@/types/dashboard';
import { Logger } from '@/lib/services/logger';
import { DocumentService } from '@/lib/services/document-service';

export const GET = withAuth(async (request: NextRequest, userEmail: string) => {
  Logger.api.start('DASHBOARD-STATS', userEmail);
  
  try {
    const errors: Array<{ metric: string; error: string }> = [];

    // Initialize stats with defaults
    let documentsCount = 0;
    let comparisonsCount = 0;
    let suggestionsCount = 0;
    const exportsCount = 0; // Not implemented yet

    // Fetch documents count (only processed ones count as "analyzed")
    try {
      const documents = await DocumentService.getUserDocuments(userEmail);
      documentsCount = documents.filter(doc => doc.status === DocumentStatus.PROCESSED).length;
      Logger.db.found('processed documents', documentsCount, { userEmail });
    } catch (error) {
      Logger.db.error('Error fetching documents for stats', error as Error);
      errors.push({ metric: 'documents', error: 'Failed to fetch documents' });
    }

    // Fetch comparisons count (only completed ones)
    try {
      const comparisons = await comparisonDb.findByUser(userEmail);
      comparisonsCount = comparisons.filter(comp => comp.status === ComparisonStatus.COMPLETED).length;
      
      // Calculate total suggestions across all comparisons
      suggestionsCount = comparisons.reduce((total, comp) => {
        return total + (comp.ai_suggestions?.length || 0);
      }, 0);
    } catch (error) {
      Logger.db.error('Error fetching comparisons for stats', error as Error);
      errors.push({ metric: 'comparisons', error: 'Failed to fetch comparisons' });
      errors.push({ metric: 'suggestions', error: 'Failed to calculate suggestions' });
    }

    // TODO: Implement exports count when exportDb is available
    // For now, exports count remains 0

    const stats: DashboardStats = {
      documents: documentsCount,
      comparisons: comparisonsCount,
      suggestions: suggestionsCount,
      exports: exportsCount,
      lastUpdated: new Date().toISOString()
    };

    // Use ApiResponse with cache headers
    const responseData = errors.length > 0 
      ? { ...stats, errors } 
      : stats;
      
    return ApiResponse.successWithHeaders(
      responseData,
      { 'Cache-Control': 'private, max-age=60' }
    );

  } catch (error) {
    Logger.api.error('DASHBOARD-STATS', 'Failed to fetch dashboard statistics', error as Error);
    return ApiErrors.serverError('Failed to fetch dashboard statistics');
  }
});